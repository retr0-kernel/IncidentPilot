import type {
  ActorType,
  Incident,
  IncidentSeverity,
  IncidentStatus
} from "../domain/incident";
import { ConflictError, NotFoundError } from "../lib/errors";
import { InfrastructureRepository } from "../db/queries/infrastructure";
import { IncidentRepository } from "../db/queries/incidents";

export class IncidentService {
  constructor(
    private readonly incidents: IncidentRepository,
    private readonly infrastructure: InfrastructureRepository
  ) {}

  async createIncident(input: {
    title: string;
    description: string;
    serviceName: string;
    severity: IncidentSeverity;
    actorType?: ActorType;
    actorId?: string;
    sourceChannel?: "web" | "slack" | "workflow" | "system";
  }): Promise<Incident> {
    const service = await this.infrastructure.getServiceByName(
      input.serviceName
    );
    return this.incidents.createIncident({
      title: input.title,
      description: input.description,
      serviceId: service.id,
      severity: input.severity,
      actorType: input.actorType ?? "agent",
      actorId: input.actorId ?? "incidentpilot",
      sourceChannel: input.sourceChannel ?? "web"
    });
  }

  async getIncidentById(id: string): Promise<Incident> {
    const incident = await this.incidents.getIncidentById(id);
    if (!incident) {
      throw new NotFoundError(`Incident not found: ${id}`, { incidentId: id });
    }
    return incident;
  }

  async getIncidentByKey(incidentKey: string): Promise<Incident> {
    const incident = await this.incidents.getIncidentByKey(incidentKey);
    if (!incident) {
      throw new NotFoundError(`Incident not found: ${incidentKey}`, {
        incidentKey
      });
    }
    return incident;
  }

  getIncidentHistory(serviceName: string, limit = 10) {
    return this.incidents.getIncidentHistory(serviceName, limit);
  }

  searchActiveIncidents(serviceName?: string) {
    return this.incidents.searchActiveIncidents(serviceName);
  }

  getIncidentTimeline(incidentId: string) {
    return this.incidents.getIncidentTimeline(incidentId);
  }

  async startInvestigation(incidentId: string, actorId = "incidentpilot") {
    return this.incidents.transitionStatus({
      incidentId,
      nextStatus: "INVESTIGATING",
      actorType: "agent",
      actorId,
      sourceChannel: "web",
      eventType: "INVESTIGATION_STARTED"
    });
  }

  async transitionStatus(input: {
    incidentId: string;
    nextStatus: IncidentStatus;
    actorType?: ActorType;
    actorId?: string;
    sourceChannel?: "web" | "slack" | "workflow" | "system";
    metadata?: Record<string, unknown>;
    eventType?: Parameters<
      IncidentRepository["transitionStatus"]
    >[0]["eventType"];
  }) {
    try {
      return await this.incidents.transitionStatus({
        incidentId: input.incidentId,
        nextStatus: input.nextStatus,
        actorType: input.actorType ?? "agent",
        actorId: input.actorId ?? "incidentpilot",
        sourceChannel: input.sourceChannel ?? "web",
        metadata: input.metadata,
        eventType: input.eventType
      });
    } catch (error) {
      if (error instanceof ConflictError) throw error;
      throw error;
    }
  }
}
