export * from "./context";
export * from "./incident";
export * from "./service";
export * from "./deployment";
export * from "./remediation";

export type UserRole = "viewer" | "operator" | "approver";

export interface ActorIdentity {
  userId: string;
  role: UserRole;
  workspaceId?: string;
}

export type ChannelType = "web" | "slack";

export interface NormalizedUserMessage {
  channel: ChannelType;
  userId: string;
  workspaceId?: string;
  conversationReference: string;
  externalMessageId?: string;
  contextKey?: string;
  content: string;
}
