export const TABLES = {
  conversationContexts: "conversation_contexts",
  conversationMessages: "conversation_messages",
  contextSequence: "context_sequence",
  contextEvents: "context_events",
  services: "services",
  deployments: "deployments",
  metrics: "metrics",
  logs: "logs",
  incidents: "incidents",
  remediationActions: "remediation_actions",
  incidentEvents: "incident_events",
  slackEventIdempotency: "slack_event_idempotency"
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];
