import { runSqlScript } from "../../src/db/lib/sql";
import migrationSql from "../../src/db/migrations/0001_initial_schema.sql?raw";
import seedSql from "../../src/db/seed/001_demo_environment.sql?raw";
import { createQueryRunner } from "../../src/db/client";
import { InfrastructureRepository } from "../../src/db/queries/infrastructure";
import { IncidentRepository } from "../../src/db/queries/incidents";
import { InvestigationService } from "../../src/domain/investigation";
import { RemediationRepository } from "../../src/db/queries/remediation";
import { RemediationService } from "../../src/domain/remediation-service";
import { SCENARIO_SERVICES } from "../../src/db/seed/constants";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
  await runSqlScript(env.DB, migrationSql);
  await runSqlScript(env.DB, seedSql);
});

describe("Evaluation harness — five demo scenarios", () => {
  const investigation = () =>
    new InvestigationService(
      new InfrastructureRepository(createQueryRunner(env.DB)),
      new IncidentRepository(createQueryRunner(env.DB))
    );

  const remediation = () =>
    new RemediationService(
      new RemediationRepository(createQueryRunner(env.DB)),
      new InfrastructureRepository(createQueryRunner(env.DB)),
      new IncidentRepository(createQueryRunner(env.DB))
    );

  it("covers all seeded services", async () => {
    for (const serviceName of SCENARIO_SERVICES) {
      const report = await investigation().investigateService(serviceName);
      expect(report.service).toBe(serviceName);
      expect(report.hypotheses[0]?.confidence ?? 0).toBeGreaterThan(0.4);
    }
  });

  it("scenario 1 — checkout deployment regression", async () => {
    const report = await investigation().investigateService("checkout-service");
    expect(report.likelyCause.toLowerCase()).toContain("deployment");
    expect(report.currentDeployment).toBe("v42");
    expect(remediation().verifyService("checkout-service", "rollback")).toBe(
      "RESOLVED"
    );
  });

  it("scenario 2 — payments dependency degradation", async () => {
    const report = await investigation().investigateService("payments-service");
    expect(report.likelyCause.toLowerCase()).toMatch(
      /database|dependency|pay-db/
    );
    expect(report.recommendedAction.toLowerCase()).not.toContain("rollback");
  });

  it("scenario 3 — auth traffic spike", async () => {
    const report = await investigation().investigateService("auth-service");
    expect(report.likelyCause.toLowerCase()).toMatch(/traffic|rate|429/);
    expect(report.likelyCause.toLowerCase()).not.toContain(
      "deployment regression"
    );
  });

  it("scenario 4 — catalog false deployment correlation", async () => {
    const report = await investigation().investigateService("catalog-service");
    expect(report.likelyCause.toLowerCase()).toMatch(/cache|redis/);
  });

  it("scenario 5 — notification rollback does not recover service", async () => {
    const report = await investigation().investigateService(
      "notification-service"
    );
    expect(report.likelyCause.toLowerCase()).toMatch(
      /smtp|credential|rollback/
    );
    expect(
      remediation().verifyService("notification-service", "rollback")
    ).toBe("NOT_RESOLVED");
  });
});
