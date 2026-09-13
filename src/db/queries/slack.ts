import { TABLES } from "../schema/tables";
import type { QueryRunner } from "../client";

export class SlackRepository {
  constructor(private readonly db: QueryRunner) {}

  async hasProcessedEvent(eventId: string): Promise<boolean> {
    const row = await this.db.first<{ event_id: string }>(
      `SELECT event_id FROM ${TABLES.slackEventIdempotency} WHERE event_id = ?`,
      eventId
    );
    return Boolean(row);
  }

  async recordProcessedEvent(
    eventId: string,
    workspaceId: string
  ): Promise<void> {
    await this.db.run(
      `INSERT OR IGNORE INTO ${TABLES.slackEventIdempotency}
        (event_id, workspace_id, processed_at)
       VALUES (?, ?, ?)`,
      eventId,
      workspaceId,
      new Date().toISOString()
    );
  }
}
