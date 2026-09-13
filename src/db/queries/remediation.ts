import type { QueryRunner } from "../client";
import { TABLES } from "../schema/tables";
import { NotFoundError } from "../../lib/errors";
import type { RemediationStatus } from "../../domain/remediation";
import type { VerificationResult } from "../../domain/incident";

export interface RemediationRow {
  id: string;
  incident_id: string;
  action: string;
  requested_by: string;
  approved_by: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  result: string | null;
}

export class RemediationRepository {
  constructor(private readonly db: QueryRunner) {}

  async createProposal(input: {
    incidentId: string;
    action: string;
    requestedBy: string;
  }) {
    const id = crypto.randomUUID();
    await this.db.run(
      `INSERT INTO ${TABLES.remediationActions} (
        id, incident_id, action, requested_by, approved_by, status, started_at, completed_at, result
      ) VALUES (?, ?, ?, ?, NULL, 'awaiting_approval', NULL, NULL, NULL)`,
      id,
      input.incidentId,
      input.action,
      input.requestedBy
    );
    return this.getById(id);
  }

  async getById(id: string) {
    const row = await this.db.first<RemediationRow>(
      `SELECT * FROM ${TABLES.remediationActions} WHERE id = ?`,
      id
    );
    if (!row) throw new NotFoundError(`Remediation not found: ${id}`, { id });
    return row;
  }

  async listPending(limit = 20) {
    const result = await this.db.all<RemediationRow>(
      `SELECT * FROM ${TABLES.remediationActions}
       WHERE status = 'awaiting_approval'
       ORDER BY rowid DESC
       LIMIT ?`,
      limit
    );
    return result.results;
  }

  async updateStatus(
    id: string,
    status: RemediationStatus,
    patch: {
      approvedBy?: string | null;
      startedAt?: string | null;
      completedAt?: string | null;
      result?: Record<string, unknown> | null;
    } = {}
  ) {
    await this.getById(id);
    await this.db.run(
      `UPDATE ${TABLES.remediationActions}
       SET status = ?, approved_by = COALESCE(?, approved_by),
           started_at = COALESCE(?, started_at),
           completed_at = COALESCE(?, completed_at),
           result = COALESCE(?, result)
       WHERE id = ?`,
      status,
      patch.approvedBy ?? null,
      patch.startedAt ?? null,
      patch.completedAt ?? null,
      patch.result ? JSON.stringify(patch.result) : null,
      id
    );
    return this.getById(id);
  }

  async upsertWorkflowInstance(input: {
    id: string;
    workflowKey: string;
    incidentId: string;
    contextId: string;
    status: string;
    metadata?: Record<string, unknown>;
  }) {
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO ${TABLES.workflowInstances} (
        id, workflow_key, incident_id, context_id, status, created_at, updated_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at,
        metadata = excluded.metadata`,
      input.id,
      input.workflowKey,
      input.incidentId,
      input.contextId,
      input.status,
      now,
      now,
      input.metadata ? JSON.stringify(input.metadata) : null
    );
  }

  async setIncidentVerification(
    incidentId: string,
    verificationResult: VerificationResult,
    status: "RESOLVED" | "FAILED"
  ) {
    await this.db.run(
      `UPDATE ${TABLES.incidents}
       SET verification_result = ?, status = ?, resolved_at = datetime('now')
       WHERE id = ?`,
      verificationResult,
      status,
      incidentId
    );
  }
}
