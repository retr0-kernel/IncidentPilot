export type ContextStatus = "ACTIVE" | "ARCHIVED" | "CLOSED";

export type MessageChannel = "web" | "slack" | "workflow" | "system";

export type MessageRole = "user" | "assistant" | "tool" | "system";

export interface ConversationContext {
  id: string;
  contextKey: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  sourceChannel: MessageChannel;
  sourceReference: string | null;
  status: ContextStatus;
  summary: string | null;
  agentInstanceId: string | null;
}

export interface ConversationMessage {
  id: string;
  contextId: string;
  role: MessageRole;
  content: string;
  channel: MessageChannel;
  externalMessageId: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export type ContextEventType =
  | "CONTEXT_CREATED"
  | "MESSAGE_ADDED"
  | "CONTEXT_REFERENCED"
  | "CONTEXT_SWITCHED"
  | "SUMMARY_UPDATED"
  | "ENTITY_LINKED"
  | "WORKFLOW_LINKED";

export interface ContextEvent {
  id: string;
  contextId: string;
  eventType: ContextEventType;
  sourceChannel: MessageChannel | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ContextMemorySnapshot {
  summary: string | null;
  importantFacts: string[];
  importantDecisions: string[];
  linkedEntities: LinkedEntity[];
  workflowReferences: string[];
  recentMessages: ConversationMessage[];
}

export interface LinkedEntity {
  type: "service" | "incident" | "deployment" | "workflow";
  id: string;
  label: string;
}
