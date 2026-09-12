/**
 * Durable remediation workflow — implemented in TASK 10.
 */
export const INCIDENT_WORKFLOW_NAME = "IncidentRemediationWorkflow";

export interface IncidentWorkflowParams {
  incidentId: string;
  contextId: string;
  proposedAction: string;
}
