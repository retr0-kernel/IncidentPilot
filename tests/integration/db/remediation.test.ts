import { runSqlScript } from "../../../src/db/lib/sql";
import migrationSql from "../../../src/db/migrations/0001_initial_schema.sql?raw";
import seedSql from "../../../src/db/seed/001_demo_environment.sql?raw";
import { createQueryRunner } from "../../../src/db/client";
import { InfrastructureRepository } from "../../../src/db/queries/infrastructure";
import { IncidentRepository } from "../../../src/db/queries/incidents";
import { RemediationRepository } from "../../../src/db/queries/remediation";
import { RemediationService } from "../../../src/domain/remediation-service";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
  await runSqlScript(env.DB, migrationSql);
  await runSqlScript(env.DB, seedSql);
});

describe("Remediation domain", () => {
  const service = () => {
    const db = createQueryRunner(env.DB);
    return new RemediationService(
      new RemediationRepository(db),
      new InfrastructureRepository(db),
      new IncidentRepository(db)
    );
  };

  it("proposes remediation and simulates execution after approval", async () => {
    const incidents = new IncidentRepository(createQueryRunner(env.DB));
    const created = await incidents.createIncident({
      title: "Checkout regression",
      description: "Elevated errors after deploy",
      serviceId: (
        await new InfrastructureRepository(
          createQueryRunner(env.DB)
        ).getServiceByName("checkout-service")
      ).id,
      severity: "SEV2",
      actorType: "agent",
      actorId: "test",
      sourceChannel: "web"
    });

    const proposal = await service().proposeRemediation({
      incidentId: created.id,
      action: "Rollback checkout-service to v41",
      requestedBy: "test-agent"
    });

    expect(proposal.status).toBe("awaiting_approval");

    await service().markApproved(proposal.id, "approver-1");
    const execution = await service().simulateExecute({
      remediationId: proposal.id,
      serviceName: "checkout-service",
      action: proposal.action
    });

    expect(execution.healthRecovered).toBe(true);
    expect(execution.verificationResult).toBe("RESOLVED");

    await service().finalizeIncident(created.id, execution.verificationResult);
    const updated = await incidents.getIncidentById(created.id);
    expect(updated?.status).toBe("RESOLVED");
  });

  it("reports notification-service as not resolved after rollback", async () => {
    const verification = service().verifyService(
      "notification-service",
      "rollback"
    );
    expect(verification).toBe("NOT_RESOLVED");
  });
});
