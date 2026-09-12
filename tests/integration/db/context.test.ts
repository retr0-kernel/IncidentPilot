import { runSqlScript } from "../../../src/db/lib/sql";
import migrationSql from "../../../src/db/migrations/0001_initial_schema.sql?raw";
import seedSql from "../../../src/db/seed/001_demo_environment.sql?raw";
import { createQueryRunner } from "../../../src/db/client";
import { ContextRepository } from "../../../src/db/queries/context";
import { createContextService } from "../../../src/domain/context-service";
import { loadServerConfig } from "../../../src/lib/config";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";

const config = loadServerConfig({
  CONTEXT_ID_PREFIX: "NWE",
  CONTEXT_SEQUENCE_WIDTH: "3"
});

beforeAll(async () => {
  await runSqlScript(env.DB, migrationSql);
  await runSqlScript(env.DB, seedSql);
});

describe("Context ID subsystem", () => {
  it("creates monotonic context keys", async () => {
    const repo = new ContextRepository(createQueryRunner(env.DB));
    const service = createContextService(repo, config);

    const first = await service.createContext({
      createdBy: "test-user",
      sourceChannel: "web"
    });
    const second = await service.createContext({
      createdBy: "test-user",
      sourceChannel: "web"
    });

    expect(first.contextKey).toBe("NWE-001");
    expect(second.contextKey).toBe("NWE-002");
  });

  it("resolves, appends messages, and updates summary", async () => {
    const repo = new ContextRepository(createQueryRunner(env.DB));
    const service = createContextService(repo, config);
    const context = await service.createContext({
      createdBy: "test-user",
      sourceChannel: "web"
    });

    await service.appendMessage({
      contextId: context.id,
      role: "user",
      content: "Why is checkout failing?",
      channel: "web"
    });

    const resolved = await service.resolveContextKey(context.contextKey);
    expect(resolved.id).toBe(context.id);

    const updated = await service.updateSummary(
      context.id,
      "Investigating checkout degradation"
    );
    expect(updated.summary).toBe("Investigating checkout degradation");

    const messages = await service.getRelevantMessages(context.id, 5);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toContain("checkout");
  });

  it("allocates unique keys under concurrent creation", async () => {
    const repo = new ContextRepository(createQueryRunner(env.DB));
    const service = createContextService(repo, config);

    const contexts = await Promise.all(
      Array.from({ length: 8 }, () =>
        service.createContext({
          createdBy: "concurrency-test",
          sourceChannel: "web"
        })
      )
    );

    const keys = contexts.map((context) => context.contextKey);
    expect(new Set(keys).size).toBe(8);
    expect(keys.every((key) => /^NWE-\d{3}$/.test(key))).toBe(true);
  });
});
