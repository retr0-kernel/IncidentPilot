export type RemediationStatus =
  | "proposed"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "running"
  | "completed"
  | "failed";

export interface RemediationAction {
  id: string;
  incidentId: string;
  action: string;
  requestedBy: string;
  approvedBy: string | null;
  status: RemediationStatus;
  startedAt: string | null;
  completedAt: string | null;
  result: Record<string, unknown> | null;
}

export interface RemediationProposal {
  incidentId: string;
  serviceName: string;
  action: string;
  reason: string;
  risk: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
}
