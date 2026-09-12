import type { QueryRunner } from "../client";
import {
  mapIncidentEventRow,
  mapIncidentRow,
  type IncidentEventRow,
  type IncidentRow
} from "../mappers";
import { TABLES } from "../schema/tables";
import type {
  ActorType,
  Incident,
  IncidentEventType,
  IncidentSeverity,
  IncidentStatus
} from "../../domain/incident";
import {
  ConfigurationError,
  ConflictError,
  NotFoundError
} from "../../lib/errors";
import { formatIncidentKey } from "../../lib/ids";

const ACTIVE_STATUSES: IncidentStatus[] = [
  "OPEN",
  "INVESTIGATING",
  "REMEDIATION_PROPOSED",
  "AWAITING_APPROVAL",
  "REMEDIATING",
  "VERIFYING"
];

const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  OPEN: ["INVESTIGATING", "REMEDIATION_PROPOSED"],
  INVESTIGATING: ["REMEDIATION_PROPOSED", "OPEN"],
  REMEDIATION_PROPOSED: ["AWAITING_APPROVAL", "INVESTIGATING"],
  AWAITING_APPROVAL: ["REMEDIATING", "INVESTIGATING"],
  REMEDIATING: ["VERIFYING", "FAILED"],
  VERIFYING: ["RESOLVED", "FAILED"],
  RESOLVED: [],
  FAILED: ["INVESTIGATING"]
};

export class IncidentRepository {
  constructor(private readonly db: QueryRunner) {}

  async allocateIncidentKey(): Promise<number> {
    const row = await this.db.first<{ sequence: number }>(
      `UPDATE ${TABLES.incidentSequence}
       SET next_value = next_value + 1
       WHERE id = 1
       RETURNING (next_value - 1) AS sequence`
    );
    if (!row) {
      throw new ConfigurationError("Incident sequence not initialized");
    }
    return row.sequence;
  }

  async createIncident(input: {
    title: string;
    description: string;
    serviceId: string;
    severity: IncidentSeverity;
    actorType: ActorType;
    actorId: string;
    sourceChannel: "web" | "slack" | "workflow" | "system";
  }): Promise<Incident> {
    const sequence = await this.allocateIncidentKey();
    const incidentKey = formatIncidentKey(sequence);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO ${TABLES.incidents} (
        id, incident_key, title, description, service_id, severity, status,
        detected_at, resolved_at, root_cause, confidence, recommended_action,
        resolution_summary, verification_result
      ) VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, NULL, NULL, NULL, NULL, NULL, NULL)`,
      id,
      incidentKey,
      input.title,
      input.description,
      input.serviceId,
      input.severity,
      now
    );

    await this.appendEvent({
      incidentId: id,
      eventType: "INCIDENT_CREATED",
      actorType: input.actorType,
      actorId: input.actorId,
      sourceChannel: input.sourceChannel,
      metadata: { incidentKey, severity: input.severity }
    });

    return (await this.getIncidentById(id))!;
  }

  async getIncidentById(id: string): Promise<Incident | null> {
    const row = await this.db.first<IncidentRow>(
      `SELECT * FROM ${TABLES.incidents} WHERE id = ?`,
      id
    );
    return row ? mapIncidentRow(row) : null;
  }

  async getIncidentByKey(incidentKey: string): Promise<Incident | null> {
    const row = await this.db.first<IncidentRow>(
      `SELECT * FROM ${TABLES.incidents} WHERE incident_key = ?`,
      incidentKey
    );
    return row ? mapIncidentRow(row) : null;
  }

  async getIncidentHistory(serviceName: string, limit = 10) {
    const result = await this.db.all<IncidentRow & { service_name: string }>(
      `SELECT i.*, s.name AS service_name
       FROM ${TABLES.incidents} i
       JOIN ${TABLES.services} s ON s.id = i.service_id
       WHERE s.name = ?
       ORDER BY i.detected_at DESC
       LIMIT ?`,
      serviceName,
      limit
    );

    return {
      service: serviceName,
      incidents: result.results.map((row) => ({
        ...mapIncidentRow(row),
        serviceName: row.service_name
      }))
    };
  }

  async searchActiveIncidents(serviceName?: string) {
    const placeholders = ACTIVE_STATUSES.map(() => "?").join(", ");
    const params: unknown[] = [...ACTIVE_STATUSES];

    let sql = `SELECT i.* FROM ${TABLES.incidents} i`;
    if (serviceName) {
      sql += ` JOIN ${TABLES.services} s ON s.id = i.service_id WHERE s.name = ? AND i.status IN (${placeholders})`;
      params.unshift(serviceName);
    } else {
      sql += ` WHERE i.status IN (${placeholders})`;
    }
    sql += " ORDER BY i.detected_at DESC";

    const result = await this.db.all<IncidentRow>(sql, ...params);
    return result.results.map(mapIncidentRow);
  }

  async getIncidentTimeline(incidentId: string) {
    const incident = await this.getIncidentById(incidentId);
    if (!incident) {
      throw new NotFoundError(`Incident not found: ${incidentId}`, {
        incidentId
      });
    }

    const result = await this.db.all<IncidentEventRow>(
      `SELECT * FROM ${TABLES.incidentEvents}
       WHERE incident_id = ?
       ORDER BY timestamp ASC`,
      incidentId
    );

    return {
      incident,
      events: result.results.map(mapIncidentEventRow)
    };
  }

  async transitionStatus(input: {
    incidentId: string;
    nextStatus: IncidentStatus;
    actorType: ActorType;
    actorId: string;
    sourceChannel: "web" | "slack" | "workflow" | "system";
    metadata?: Record<string, unknown>;
    eventType?: IncidentEventType;
  }): Promise<Incident> {
    const incident = await this.getIncidentById(input.incidentId);
    if (!incident) {
      throw new NotFoundError(`Incident not found: ${input.incidentId}`);
    }

    const allowed = ALLOWED_TRANSITIONS[incident.status];
    if (!allowed.includes(input.nextStatus)) {
      throw new ConflictError(
        `Cannot transition incident from ${incident.status} to ${input.nextStatus}`,
        {
          incidentId: input.incidentId,
          from: incident.status,
          to: input.nextStatus
        }
      );
    }

    const resolvedAt =
      input.nextStatus === "RESOLVED" || input.nextStatus === "FAILED"
        ? new Date().toISOString()
        : null;

    await this.db.run(
      `UPDATE ${TABLES.incidents}
       SET status = ?, resolved_at = COALESCE(?, resolved_at)
       WHERE id = ?`,
      input.nextStatus,
      resolvedAt,
      input.incidentId
    );

    await this.appendEvent({
      incidentId: input.incidentId,
      eventType: input.eventType ?? "HYPOTHESIS_UPDATED",
      actorType: input.actorType,
      actorId: input.actorId,
      sourceChannel: input.sourceChannel,
      metadata: {
        fromStatus: incident.status,
        toStatus: input.nextStatus,
        ...input.metadata
      }
    });

    return (await this.getIncidentById(input.incidentId))!;
  }

  async appendEvent(input: {
    incidentId: string;
    eventType: IncidentEventType;
    actorType: ActorType;
    actorId: string;
    sourceChannel: "web" | "slack" | "workflow" | "system" | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.db.run(
      `INSERT INTO ${TABLES.incidentEvents} (
        id, incident_id, timestamp, event_type, actor_type, actor_id, source_channel, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      input.incidentId,
      new Date().toISOString(),
      input.eventType,
      input.actorType,
      input.actorId,
      input.sourceChannel,
      input.metadata ? JSON.stringify(input.metadata) : null
    );
  }
}
