export interface PendingApprovalState {
  action: string;
  incidentId?: string;
  workflowId?: string;
}

export interface AgentState {
  contextKey?: string;
  contextId?: string;
  activeWorkflowId?: string;
  activeIncidentIds?: string[];
  currentService?: string;
  currentIntent?: string;
  pendingApproval?: PendingApprovalState;
}

export const initialAgentState = (): AgentState => ({});
