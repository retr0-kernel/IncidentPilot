import type {
  ConversationContext,
  ConversationMessage,
  MessageChannel
} from "../domain/context";
import { NotFoundError } from "../lib/errors";
import { parseContextKey } from "../lib/ids";
import type { ServerConfig } from "../lib/config";
import {
  ContextRepository,
  type AppendMessageInput
} from "../db/queries/context";

export class ContextService {
  constructor(
    private readonly repo: ContextRepository,
    private readonly config: Pick<
      ServerConfig,
      "contextIdPrefix" | "contextSequenceWidth"
    >
  ) {}

  async createContext(input: {
    createdBy: string;
    sourceChannel: MessageChannel;
    sourceReference?: string | null;
    agentInstanceId?: string | null;
  }): Promise<ConversationContext> {
    return this.repo.createContextRecord({
      ...input,
      prefix: this.config.contextIdPrefix
    });
  }

  async resolveContextKey(contextKey: string): Promise<ConversationContext> {
    const parsed = parseContextKey(contextKey, this.config.contextIdPrefix);
    const context = await this.repo.getContextByKey(parsed.canonicalKey);
    if (!context) {
      throw new NotFoundError(`Context not found: ${parsed.canonicalKey}`, {
        contextKey: parsed.canonicalKey
      });
    }
    return context;
  }

  async getContext(contextId: string): Promise<ConversationContext> {
    const context = await this.repo.getContextById(contextId);
    if (!context) {
      throw new NotFoundError(`Context not found: ${contextId}`, { contextId });
    }
    return context;
  }

  async getContextByKey(contextKey: string): Promise<ConversationContext> {
    return this.resolveContextKey(contextKey);
  }

  async appendMessage(
    input: Omit<AppendMessageInput, "contextId"> & { contextId: string }
  ): Promise<ConversationMessage> {
    await this.getContext(input.contextId);
    return this.repo.appendMessage(input);
  }

  async updateSummary(
    contextId: string,
    summary: string
  ): Promise<ConversationContext> {
    await this.getContext(contextId);
    return this.repo.updateSummary(contextId, summary);
  }

  async getRelevantMessages(
    contextId: string,
    limit = 20
  ): Promise<ConversationMessage[]> {
    await this.getContext(contextId);
    return this.repo.getRecentMessages(contextId, limit);
  }
}

export function createContextService(
  repo: ContextRepository,
  config: ServerConfig
): ContextService {
  return new ContextService(repo, config);
}
