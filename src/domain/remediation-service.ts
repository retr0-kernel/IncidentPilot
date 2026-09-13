import { SERVICE_NAMES } from "../db/seed/constants";
import { RemediationRepository } from "../db/queries/remediation";
import { InfrastructureRepository } from "../db/queries/infrastructure";
import { IncidentRepository } from "../db/queries/incidents";
import type { VerificationResult } from "./incident";
import { ConflictError } from "../lib/errors";

export interface RemediationExecutionResult {
  simulated: true;
  serviceName: string;
  action: string;
  healthRecovered: boolean;
  verificationResult: VerificationResult;
  details: Record<string, unknown>;
}

export interface RemediationLinkMetadata extends Record<string, unknown> {
  workflowId: string;
  agentInstanceId: string;
  contextKey?: string;
}

function parseResult(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export class RemediationService {
  constructor(
    private readonly remediation: RemediationRepository,
    private readonly infrastructure: InfrastructureRepository,
    private readonly incidents: IncidentRepository
  ) {}

  async getById(remediationId: string) {
    const row = await this.remediation.getById(remediationId);
    return {
      id: row.id,
      incidentId: row.incident_id,
      action: row.action,
      requestedBy: row.requested_by,
      approvedBy: row.approved_by,
      status: row.status,
      result: parseResult(row.result)
    };
  }

  async proposeRemediation(input: {
    incidentId: string;
    action: string;
    requestedBy: string;
  }) {
    const incident = await this.incidents.getIncidentById(input.incidentId);
    if (!incident) {
      throw new ConflictError("Incident not found for remediation proposal", {
        incidentId: input.incidentId
      });
    }

    const proposal = await this.remediation.createProposal({
      incidentId: input.incidentId,
      action: input.action,
      requestedBy: input.requestedBy
    });

    if (incident.status === "OPEN") {
      await this.incidents.transitionStatus({
        incidentId: input.incidentId,
        nextStatus: "INVESTIGATING",
        actorType: "agent",
        actorId: input.requestedBy,
        sourceChannel: "web",
        eventType: "INVESTIGATION_STARTED"
      });
    }

    const refreshed = await this.incidents.getIncidentById(input.incidentId);
    if (refreshed?.status === "INVESTIGATING") {
      await this.incidents.transitionStatus({
        incidentId: input.incidentId,
        nextStatus: "REMEDIATION_PROPOSED",
        actorType: "agent",
        actorId: input.requestedBy,
        sourceChannel: "web",
        eventType: "REMEDIATION_PROPOSED",
        metadata: { remediationId: proposal.id, action: input.action }
      });
    }

    await this.incidents.transitionStatus({
      incidentId: input.incidentId,
      nextStatus: "AWAITING_APPROVAL",
      actorType: "agent",
      actorId: input.requestedBy,
      sourceChannel: "web",
      eventType: "APPROVAL_REQUESTED",
      metadata: { remediationId: proposal.id, action: input.action }
    });

    return {
      id: proposal.id,
      incidentId: proposal.incident_id,
      action: proposal.action,
      status: proposal.status
    };
  }

  async linkWorkflow(remediationId: string, metadata: RemediationLinkMetadata) {
    await this.remediation.updateStatus(remediationId, "awaiting_approval", {
      result: metadata
    });
  }

  listPendingApprovals() {
    return this.remediation.listPending();
  }

  async markApproved(remediationId: string, approvedBy: string) {
    return this.remediation.updateStatus(remediationId, "approved", {
      approvedBy
    });
  }

  async markRejected(remediationId: string, approvedBy: string) {
    return this.remediation.updateStatus(remediationId, "rejected", {
      approvedBy,
      completedAt: new Date().toISOString(),
      result: { rejected: true, rejectedBy: approvedBy }
    });
  }

  async simulateExecute(input: {
    remediationId: string;
    serviceName: string;
    action: string;
  }): Promise<RemediationExecutionResult> {
    await this.remediation.updateStatus(input.remediationId, "running", {
      startedAt: new Date().toISOString()
    });

    const health = await this.infrastructure.getServiceHealth(
      input.serviceName
    );
    const verificationResult = this.verifyService(
      input.serviceName,
      input.action
    );

    const healthRecovered = verificationResult === "RESOLVED";

    await this.remediation.updateStatus(input.remediationId, "completed", {
      completedAt: new Date().toISOString(),
      result: {
        simulated: true,
        healthRecovered,
        verificationResult,
        currentDeployment: health.currentDeployment
      }
    });

    return {
      simulated: true,
      serviceName: input.serviceName,
      action: input.action,
      healthRecovered,
      verificationResult,
      details: {
        currentDeployment: health.currentDeployment,
        status: health.status
      }
    };
  }

  verifyService(serviceName: string, _action: string): VerificationResult {
    switch (serviceName) {
      case SERVICE_NAMES.checkout:
      case SERVICE_NAMES.payments:
      case SERVICE_NAMES.auth:
        return "RESOLVED";
      case SERVICE_NAMES.catalog:
        return "PARTIALLY_RECOVERED";
      case SERVICE_NAMES.notification:
        return "NOT_RESOLVED";
      default:
        return "PARTIALLY_RECOVERED";
    }
  }

  async finalizeIncident(
    incidentId: string,
    verificationResult: VerificationResult
  ) {
    const status =
      verificationResult === "NOT_RESOLVED" ? "FAILED" : "RESOLVED";
    await this.remediation.setIncidentVerification(
      incidentId,
      verificationResult,
      status
    );
    await this.incidents.appendEvent({
      incidentId,
      eventType:
        verificationResult === "NOT_RESOLVED"
          ? "INCIDENT_FAILED"
          : "INCIDENT_RESOLVED",
      actorType: "workflow",
      actorId: "incident-remediation-workflow",
      sourceChannel: "workflow",
      metadata: { verificationResult }
    });
  }

  trackWorkflow(input: {
    workflowId: string;
    workflowKey: string;
    incidentId: string;
    contextId: string;
    status: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.remediation.upsertWorkflowInstance({
      id: input.workflowId,
      workflowKey: input.workflowKey,
      incidentId: input.incidentId,
      contextId: input.contextId,
      status: input.status,
      metadata: input.metadata
    });
  }

  getWorkflowLink(
    remediationId: string
  ): Promise<RemediationLinkMetadata | null> {
    return this.remediation.getById(remediationId).then((record) => {
      const parsed = parseResult(record.result);
      if (
        parsed &&
        typeof parsed.workflowId === "string" &&
        typeof parsed.agentInstanceId === "string"
      ) {
        return parsed as unknown as RemediationLinkMetadata;
      }
      return null;
    });
  }
}

export function createRemediationService(
  remediation: RemediationRepository,
  infrastructure: InfrastructureRepository,
  incidents: IncidentRepository
): RemediationService {
  return new RemediationService(remediation, infrastructure, incidents);
}
