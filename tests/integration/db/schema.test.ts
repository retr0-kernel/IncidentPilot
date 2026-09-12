import { CORE_TABLES } from "../../../src/db/schema";
import { runSqlScript } from "../../../src/db/lib/sql";
import migrationSql from "../../../src/db/migrations/0001_initial_schema.sql?raw";
import {
  SCENARIO_SERVICES,
  SERVICE_NAMES
} from "../../../src/db/seed/constants";
import seedSql from "../../../src/db/seed/001_demo_environment.sql?raw";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
  await runSqlScript(env.DB, migrationSql);
});

describe("D1 schema migrations", () => {
  it("creates all core tables", async () => {
    const result = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table'"
    ).all<{ name: string }>();

    const tableNames = new Set(result.results.map((row) => row.name));
    for (const table of CORE_TABLES) {
      expect(tableNames.has(table), `missing table ${table}`).toBe(true);
    }
  });

  it("initializes context and incident sequences", async () => {
    const contextSequence = await env.DB.prepare(
      "SELECT prefix, next_value, width FROM context_sequence WHERE prefix = ?"
    )
      .bind("NWE")
      .first<{ prefix: string; next_value: number; width: number }>();

    expect(contextSequence).toMatchObject({
      prefix: "NWE",
      next_value: 1,
      width: 3
    });

    const incidentSequence = await env.DB.prepare(
      "SELECT next_value FROM incident_sequence WHERE id = 1"
    ).first<{ next_value: number }>();

    expect(incidentSequence?.next_value).toBe(43);
  });
});

describe("D1 demo seed", () => {
  beforeAll(async () => {
    await runSqlScript(env.DB, seedSql);
  });

  it("seeds five deterministic services", async () => {
    const result = await env.DB.prepare(
      "SELECT name FROM services ORDER BY name ASC"
    ).all<{ name: string }>();

    expect(result.results.map((row) => row.name)).toEqual(
      [...SCENARIO_SERVICES].sort()
    );
  });

  it("seeds checkout regression evidence", async () => {
    const latest = await env.DB.prepare(
      `SELECT m.error_rate, m.p95_latency_ms, d.version
       FROM metrics m
       JOIN services s ON s.id = m.service_id
       JOIN deployments d ON d.id = s.current_deployment_id
       WHERE s.name = ?
       ORDER BY m.timestamp DESC
       LIMIT 1`
    )
      .bind(SERVICE_NAMES.checkout)
      .first<{ error_rate: number; p95_latency_ms: number; version: string }>();

    expect(latest).toMatchObject({
      version: "v42",
      error_rate: 18.4,
      p95_latency_ms: 2810
    });
  });

  it("seeds historical checkout incident INC-17", async () => {
    const incident = await env.DB.prepare(
      "SELECT incident_key, verification_result FROM incidents WHERE incident_key = ?"
    )
      .bind("INC-17")
      .first<{ incident_key: string; verification_result: string }>();

    expect(incident).toMatchObject({
      incident_key: "INC-17",
      verification_result: "RESOLVED"
    });
  });

  it("seeds notification remediation failure incident", async () => {
    const incident = await env.DB.prepare(
      "SELECT incident_key, verification_result, status FROM incidents WHERE incident_key = ?"
    )
      .bind("INC-29")
      .first<{
        incident_key: string;
        verification_result: string;
        status: string;
      }>();

    expect(incident).toMatchObject({
      incident_key: "INC-29",
      verification_result: "NOT_RESOLVED",
      status: "FAILED"
    });
  });
});
