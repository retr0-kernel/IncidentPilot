import { runSqlScript } from "../../../src/db/lib/sql";
import migrationSql from "../../../src/db/migrations/0001_initial_schema.sql?raw";
import seedSql from "../../../src/db/seed/001_demo_environment.sql?raw";
import { createQueryRunner } from "../../../src/db/client";
import { InfrastructureRepository } from "../../../src/db/queries/infrastructure";
import { IncidentRepository } from "../../../src/db/queries/incidents";
import { IncidentService } from "../../../src/domain/incident-service";
import { SERVICE_NAMES } from "../../../src/db/seed/constants";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
  await runSqlScript(env.DB, migrationSql);
  await runSqlScript(env.DB, seedSql);
});

describe("Incident domain layer", () => {
  const service = () => {
    const db = createQueryRunner(env.DB);
    const infrastructure = new InfrastructureRepository(db);
    return new IncidentService(new IncidentRepository(db), infrastructure);
  };

  it("creates incidents with sequential keys", async () => {
    const incident = await service().createIncident({
      title: "Checkout outage",
      description: "Elevated checkout errors after deploy",
      serviceName: SERVICE_NAMES.checkout,
      severity: "SEV2"
    });

    expect(incident.incidentKey).toMatch(/^INC-\d+$/);
    expect(incident.status).toBe("OPEN");
  });

  it("returns incident history and timeline", async () => {
    const history = await service().getIncidentHistory(
      SERVICE_NAMES.checkout,
      5
    );
    expect(
      history.incidents.some((item) => item.incidentKey === "INC-17")
    ).toBe(true);

    const seeded = history.incidents.find(
      (item) => item.incidentKey === "INC-17"
    );
    const timeline = await service().getIncidentTimeline(seeded!.id);
    expect(timeline.events.length).toBeGreaterThan(0);
  });

  it("transitions incident status with audit events", async () => {
    const created = await service().createIncident({
      title: "Auth spike",
      description: "429 rate limiting observed",
      serviceName: SERVICE_NAMES.auth,
      severity: "SEV3"
    });

    const investigating = await service().startInvestigation(created.id);
    expect(investigating.status).toBe("INVESTIGATING");

    const timeline = await service().getIncidentTimeline(created.id);
    expect(
      timeline.events.some(
        (event) => event.eventType === "INVESTIGATION_STARTED"
      )
    ).toBe(true);
  });

  it("finds active incidents", async () => {
    await service().createIncident({
      title: "Catalog cache latency",
      description: "Cache timeouts after deploy",
      serviceName: SERVICE_NAMES.catalog,
      severity: "SEV3"
    });

    const active = await service().searchActiveIncidents(SERVICE_NAMES.catalog);
    expect(active.length).toBeGreaterThan(0);
    expect(active.every((incident) => incident.status !== "RESOLVED")).toBe(
      true
    );
  });
});
