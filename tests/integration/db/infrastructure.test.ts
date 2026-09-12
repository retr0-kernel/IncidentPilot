import { runSqlScript } from "../../../src/db/lib/sql";
import migrationSql from "../../../src/db/migrations/0001_initial_schema.sql?raw";
import seedSql from "../../../src/db/seed/001_demo_environment.sql?raw";
import { createQueryRunner } from "../../../src/db/client";
import { InfrastructureRepository } from "../../../src/db/queries/infrastructure";
import { SERVICE_NAMES } from "../../../src/db/seed/constants";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
  await runSqlScript(env.DB, migrationSql);
  await runSqlScript(env.DB, seedSql);
});

describe("Simulated infrastructure queries", () => {
  const repo = () => new InfrastructureRepository(createQueryRunner(env.DB));

  it("returns checkout health with regression metrics", async () => {
    const health = await repo().getServiceHealth(SERVICE_NAMES.checkout);
    expect(health.status).toBe("degraded");
    expect(health.currentDeployment).toBe("v42");
    expect(health.latestMetrics?.errorRate).toBe(18.4);
  });

  it("returns recent logs and deployments", async () => {
    const logs = await repo().getRecentLogs(SERVICE_NAMES.payments, 5);
    expect(logs.entries.some((entry) => entry.errorCode === "PAY-DB-408")).toBe(
      true
    );

    const deployments = await repo().getRecentDeployments(
      SERVICE_NAMES.catalog,
      2
    );
    expect(deployments.deployments[0]?.version).toBe("v15");
  });

  it("returns service dependencies", async () => {
    const deps = await repo().getServiceDependencies(SERVICE_NAMES.checkout);
    expect(deps.dependencies.map((dep) => dep.serviceName)).toEqual(
      expect.arrayContaining(["payments-service", "catalog-service"])
    );
  });
});
