import type { ConversationContext, MessageChannel } from "../domain/context";
import { extractContextKeyFromText } from "../lib/ids";
import type { ContextService } from "../domain/context-service";
import { assertSafeUserText } from "../lib/security";
import type { AgentState } from "./state";

export async function ensureAgentContext(input: {
  services: { context: ContextService; config: { contextIdPrefix: string } };
  state: AgentState | undefined;
  setState: (state: AgentState) => void;
  agentInstanceId: string;
  userText?: string;
  sourceChannel?: MessageChannel;
  createdBy?: string;
  sourceReference?: string | null;
}): Promise<ConversationContext> {
  const sourceChannel = input.sourceChannel ?? "web";
  const createdBy = input.createdBy ?? "web-user";
  if (input.userText) {
    assertSafeUserText(input.userText);
  }
  const referenced = input.userText
    ? extractContextKeyFromText(
        input.userText,
        input.services.config.contextIdPrefix
      )
    : null;

  if (referenced) {
    const context = await input.services.context.resolveContextKey(
      referenced.canonicalKey
    );
    input.setState({
      ...input.state,
      contextId: context.id,
      contextKey: context.contextKey
    });
    return context;
  }

  if (input.state?.contextId && input.state.contextKey) {
    return input.services.context.getContext(input.state.contextId);
  }

  const context = await input.services.context.createContext({
    createdBy,
    sourceChannel,
    sourceReference: input.sourceReference ?? input.agentInstanceId,
    agentInstanceId: input.agentInstanceId
  });

  input.setState({
    ...input.state,
    contextId: context.id,
    contextKey: context.contextKey
  });

  return context;
}

export function extractLatestUserText(
  messages: Array<{
    role?: string;
    parts?: Array<{ type?: string; text?: string }>;
  }>
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const text = message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("\n")
      .trim();
    if (text) return text;
  }
  return undefined;
}
