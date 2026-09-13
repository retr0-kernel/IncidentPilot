import type { QueryRunner } from "../db/client";
import type { ContextService } from "./context-service";

export class MemoryService {
  constructor(
    private readonly context: ContextService,
    private readonly db: QueryRunner
  ) {}

  async recordFact(contextId: string, fact: string) {
    await this.context.getContext(contextId);
    await this.db.run(
      `INSERT INTO context_memory_facts (id, context_id, fact, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      crypto.randomUUID(),
      contextId,
      fact
    );
  }

  async getFacts(contextId: string, limit = 10) {
    const result = await this.db.all<{ fact: string; created_at: string }>(
      `SELECT fact, created_at FROM context_memory_facts
       WHERE context_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      contextId,
      limit
    );
    return result.results;
  }

  async refreshSummaryFromMessages(contextId: string) {
    const messages = await this.context.getRelevantMessages(contextId, 8);
    if (messages.length === 0) return null;
    const summary = messages
      .slice(-4)
      .map((message) => `${message.role}: ${message.content.slice(0, 120)}`)
      .join(" | ");
    return this.context.updateSummary(contextId, summary.slice(0, 500));
  }

  async getMemorySnapshot(contextKey: string) {
    const context = await this.context.getContextByKey(contextKey);
    const [facts, messages] = await Promise.all([
      this.getFacts(context.id, 5),
      this.context.getRelevantMessages(context.id, 10)
    ]);
    return {
      contextKey: context.contextKey,
      summary: context.summary,
      facts: facts.map((row) => row.fact),
      recentMessages: messages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt
      }))
    };
  }
}

export function createMemoryService(
  context: ContextService,
  db: QueryRunner
): MemoryService {
  return new MemoryService(context, db);
}
