/**
 * Agent tool implementations are added in TASK 7.
 */

export const investigationToolNames = [
  "getServiceHealth",
  "getRecentMetrics",
  "getRecentLogs",
  "getRecentDeployments",
  "getServiceDependencies"
] as const;

export const contextToolNames = [
  "getContextByKey",
  "getContextSummary",
  "getRelevantContextMessages"
] as const;

export const incidentToolNames = [
  "getIncidentById",
  "getIncidentHistory",
  "getIncidentTimeline",
  "searchActiveIncidents",
  "createIncident"
] as const;

export const remediationToolNames = [
  "proposeRemediation",
  "executeRemediation"
] as const;
