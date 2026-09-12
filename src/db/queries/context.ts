import type { QueryRunner } from "../client";
import {
  mapContextRow,
  mapMessageRow,
  type ContextRow,
  type MessageRow
} from "../mappers";
import { TABLES } from "../schema/tables";
import type {
  ContextEventType,
  ConversationContext,
  ConversationMessage,
  MessageChannel,
  MessageRole
} from "../../domain/context";
import { ConfigurationError, NotFoundError } from "../../lib/errors";
import { formatContextKey } from "../../lib/ids";

export interface CreateContextInput {
  createdBy: string;
  sourceChannel: MessageChannel;
  sourceReference?: string | null;
  agentInstanceId?: string | null;
  prefix: string;
}

export interface AppendMessageInput {
  contextId: string;
  role: MessageRole;
  content: string;
  channel: MessageChannel;
  externalMessageId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export class ContextRepository {
  constructor(private readonly db: QueryRunner) {}

  async allocateContextKey(prefix: string): Promise<{
    sequence: number;
    width: number;
  }> {
    const row = await this.db.first<{ sequence: number; width: number }>(
      `UPDATE ${TABLES.contextSequence}
       SET next_value = next_value + 1, updated_at = datetime('now')
       WHERE prefix = ?
       RETURNING (next_value - 1) AS sequence, width`,
      prefix
    );

    if (!row) {
      throw new ConfigurationError(
        `Context sequence not initialized for prefix "${prefix}"`
      );
    }

    return row;
  }

  async insertContext(input: {
    id: string;
    contextKey: string;
    createdBy: string;
    sourceChannel: MessageChannel;
    sourceReference: string | null;
    agentInstanceId: string | null;
    now: string;
  }): Promise<ConversationContext> {
    await this.db.run(
      `INSERT INTO ${TABLES.conversationContexts} (
        id, context_key, created_at, updated_at, created_by,
        source_channel, source_reference, status, summary, agent_instance_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NULL, ?)`,
      input.id,
      input.contextKey,
      input.now,
      input.now,
      input.createdBy,
      input.sourceChannel,
      input.sourceReference,
      input.agentInstanceId
    );

    await this.insertContextEvent({
      id: crypto.randomUUID(),
      contextId: input.id,
      eventType: "CONTEXT_CREATED",
      sourceChannel: input.sourceChannel,
      metadata: { contextKey: input.contextKey },
      createdAt: input.now
    });

    const created = await this.getContextById(input.id);
    if (!created) {
      throw new ConfigurationError("Failed to load context after insert");
    }
    return created;
  }

  async getContextById(id: string): Promise<ConversationContext | null> {
    const row = await this.db.first<ContextRow>(
      `SELECT * FROM ${TABLES.conversationContexts} WHERE id = ?`,
      id
    );
    return row ? mapContextRow(row) : null;
  }

  async getContextByKey(
    contextKey: string
  ): Promise<ConversationContext | null> {
    const row = await this.db.first<ContextRow>(
      `SELECT * FROM ${TABLES.conversationContexts} WHERE context_key = ?`,
      contextKey
    );
    return row ? mapContextRow(row) : null;
  }

  async updateSummary(
    contextId: string,
    summary: string
  ): Promise<ConversationContext> {
    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE ${TABLES.conversationContexts}
       SET summary = ?, updated_at = ?
       WHERE id = ?`,
      summary,
      now,
      contextId
    );

    await this.insertContextEvent({
      id: crypto.randomUUID(),
      contextId,
      eventType: "SUMMARY_UPDATED",
      sourceChannel: null,
      metadata: { summaryLength: summary.length },
      createdAt: now
    });

    const updated = await this.getContextById(contextId);
    if (!updated) {
      throw new NotFoundError(`Context not found: ${contextId}`);
    }
    return updated;
  }

  async appendMessage(input: AppendMessageInput): Promise<ConversationMessage> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await this.db.run(
      `INSERT INTO ${TABLES.conversationMessages} (
        id, context_id, role, content, channel, external_message_id, created_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.contextId,
      input.role,
      input.content,
      input.channel,
      input.externalMessageId ?? null,
      now,
      input.metadata ? JSON.stringify(input.metadata) : null
    );

    await this.db.run(
      `UPDATE ${TABLES.conversationContexts} SET updated_at = ? WHERE id = ?`,
      now,
      input.contextId
    );

    await this.insertContextEvent({
      id: crypto.randomUUID(),
      contextId: input.contextId,
      eventType: "MESSAGE_ADDED",
      sourceChannel: input.channel,
      metadata: { role: input.role, messageId: id },
      createdAt: now
    });

    const row = await this.db.first<MessageRow>(
      `SELECT * FROM ${TABLES.conversationMessages} WHERE id = ?`,
      id
    );
    if (!row) {
      throw new ConfigurationError("Failed to load message after insert");
    }
    return mapMessageRow(row);
  }

  async getRecentMessages(
    contextId: string,
    limit = 20
  ): Promise<ConversationMessage[]> {
    const result = await this.db.all<MessageRow>(
      `SELECT * FROM ${TABLES.conversationMessages}
       WHERE context_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      contextId,
      limit
    );
    return result.results.map(mapMessageRow).reverse();
  }

  async insertContextEvent(input: {
    id: string;
    contextId: string;
    eventType: ContextEventType;
    sourceChannel: MessageChannel | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }): Promise<void> {
    await this.db.run(
      `INSERT INTO ${TABLES.contextEvents} (
        id, context_id, event_type, source_channel, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      input.id,
      input.contextId,
      input.eventType,
      input.sourceChannel,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.createdAt
    );
  }

  async createContextRecord(
    input: CreateContextInput
  ): Promise<ConversationContext> {
    const { sequence, width } = await this.allocateContextKey(input.prefix);
    const contextKey = formatContextKey(input.prefix, sequence, width);
    const now = new Date().toISOString();

    return this.insertContext({
      id: crypto.randomUUID(),
      contextKey,
      createdBy: input.createdBy,
      sourceChannel: input.sourceChannel,
      sourceReference: input.sourceReference ?? null,
      agentInstanceId: input.agentInstanceId ?? null,
      now
    });
  }
}
