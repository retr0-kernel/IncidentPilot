export type IncidentSeverity = "SEV1" | "SEV2" | "SEV3" | "SEV4";

export type IncidentStatus =
  | "OPEN"
  | "INVESTIGATING"
  | "REMEDIATION_PROPOSED"
  | "AWAITING_APPROVAL"
  | "REMEDIATING"
  | "VERIFYING"
  | "RESOLVED"
  | "FAILED";

export type VerificationResult =
  | "RESOLVED"
  | "PARTIALLY_RECOVERED"
  | "NOT_RESOLVED";

export interface Incident {
  id: string;
  incidentKey: string;
  title: string;
  description: string;
  serviceId: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  detectedAt: string;
  resolvedAt: string | null;
  rootCause: string | null;
  confidence: number | null;
  recommendedAction: string | null;
  resolutionSummary: string | null;
  verificationResult: VerificationResult | null;
}

export type IncidentEventType =
  | "INCIDENT_CREATED"
  | "INVESTIGATION_STARTED"
  | "TOOL_EXECUTED"
  | "HYPOTHESIS_UPDATED"
  | "REMEDIATION_PROPOSED"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_GRANTED"
  | "APPROVAL_REJECTED"
  | "REMEDIATION_STARTED"
  | "REMEDIATION_COMPLETED"
  | "VERIFICATION_STARTED"
  | "INCIDENT_RESOLVED"
  | "INCIDENT_FAILED";

export type ActorType = "user" | "agent" | "system" | "workflow";

export interface IncidentEvent {
  id: string;
  incidentId: string;
  timestamp: string;
  eventType: IncidentEventType;
  actorType: ActorType;
  actorId: string;
  sourceChannel: "web" | "slack" | "workflow" | "system" | null;
  metadata: Record<string, unknown> | null;
}
