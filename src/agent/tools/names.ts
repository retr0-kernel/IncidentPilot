export const investigationToolNames = [
  "getServiceHealth",
  "getRecentMetrics",
  "getRecentLogs",
  "getRecentDeployments",
  "getServiceDependencies",
  "investigateService"
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
