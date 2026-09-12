import { runSqlScript } from "../../../src/db/lib/sql";
import migrationSql from "../../../src/db/migrations/0001_initial_schema.sql?raw";
import seedSql from "../../../src/db/seed/001_demo_environment.sql?raw";
import { createQueryRunner } from "../../../src/db/client";
import { InfrastructureRepository } from "../../../src/db/queries/infrastructure";
import { IncidentRepository } from "../../../src/db/queries/incidents";
import { InvestigationService } from "../../../src/domain/investigation";
import { SCENARIO_SERVICES } from "../../../src/db/seed/constants";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
  await runSqlScript(env.DB, migrationSql);
  await runSqlScript(env.DB, seedSql);
});

describe("Investigation intelligence", () => {
  const investigation = () =>
    new InvestigationService(
      new InfrastructureRepository(createQueryRunner(env.DB)),
      new IncidentRepository(createQueryRunner(env.DB))
    );

  it.each(SCENARIO_SERVICES)(
    "ranks a primary hypothesis for %s",
    async (serviceName) => {
      const result = await investigation().investigateService(serviceName);
      expect(result.hypotheses.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.recommendedAction.length).toBeGreaterThan(10);
      expect(result.evidence.metrics.samples.length).toBeGreaterThan(0);
    }
  );

  it("identifies checkout deployment regression", async () => {
    const result = await investigation().investigateService("checkout-service");
    expect(result.likelyCause.toLowerCase()).toContain("deployment");
    expect(result.currentDeployment).toBe("v42");
  });

  it("identifies notification remediation failure", async () => {
    const result = await investigation().investigateService(
      "notification-service"
    );
    expect(result.likelyCause.toLowerCase()).toMatch(
      /smtp|rollback|credential/
    );
  });
});
