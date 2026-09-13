/**
 * Durable remediation workflow — implemented in TASK 10.
 */
export const INCIDENT_REMEDIATION_WORKFLOW_BINDING =
  "INCIDENT_REMEDIATION_WORKFLOW";

export const INCIDENT_WORKFLOW_NAME = "IncidentRemediationWorkflow";

export interface IncidentWorkflowParams {
  incidentId: string;
  contextId: string;
  contextKey: string;
  serviceName: string;
  proposedAction: string;
  remediationActionId: string;
  agentInstanceId: string;
}

export type RemediationWorkflowProgress = {
  step: string;
  status: "running" | "complete" | "failed" | "pending";
  detail?: string;
  verification?: string;
};
