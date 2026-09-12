import {
  DEMO_ANCHOR_ISO,
  SCENARIO_SERVICES,
  SCENARIO_SUMMARY,
  SERVICE_NAMES
} from "../../../src/db/seed/constants";
import { describe, expect, it } from "vitest";

describe("demo seed constants", () => {
  it("defines five scenario services", () => {
    expect(SCENARIO_SERVICES).toHaveLength(5);
    expect(SCENARIO_SERVICES).toContain(SERVICE_NAMES.checkout);
  });

  it("documents expected scenario conclusions", () => {
    expect(SCENARIO_SUMMARY[SERVICE_NAMES.payments]).toContain("Dependency");
    expect(SCENARIO_SUMMARY[SERVICE_NAMES.notification]).toContain(
      "Remediation failure"
    );
  });

  it("uses a fixed demo anchor timestamp", () => {
    expect(DEMO_ANCHOR_ISO).toBe("2026-09-10T12:00:00.000Z");
  });
});
