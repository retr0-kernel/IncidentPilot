import { TABLES } from "./tables";

export const CORE_TABLES = [
  TABLES.conversationContexts,
  TABLES.conversationMessages,
  TABLES.contextSequence,
  TABLES.contextEvents,
  "context_memory_facts",
  "context_linked_entities",
  TABLES.services,
  TABLES.serviceDependencies,
  TABLES.deployments,
  TABLES.metrics,
  TABLES.logs,
  TABLES.incidents,
  TABLES.remediationActions,
  TABLES.incidentEvents,
  TABLES.workflowInstances,
  TABLES.slackEventIdempotency,
  TABLES.incidentSequence
] as const;

export type CoreTableName = (typeof CORE_TABLES)[number];
