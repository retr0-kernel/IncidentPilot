export const TABLES = {
  conversationContexts: "conversation_contexts",
  conversationMessages: "conversation_messages",
  contextSequence: "context_sequence",
  contextEvents: "context_events",
  contextMemoryFacts: "context_memory_facts",
  contextLinkedEntities: "context_linked_entities",
  services: "services",
  serviceDependencies: "service_dependencies",
  deployments: "deployments",
  metrics: "metrics",
  logs: "logs",
  incidents: "incidents",
  remediationActions: "remediation_actions",
  incidentEvents: "incident_events",
  incidentSequence: "incident_sequence",
  workflowInstances: "workflow_instances",
  slackEventIdempotency: "slack_event_idempotency"
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];
