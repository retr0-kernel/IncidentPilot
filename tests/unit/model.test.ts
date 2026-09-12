import { INCIDENT_PILOT_MODEL } from "../../src/lib/config";
import { describe, expect, it } from "vitest";

describe("IncidentPilot bootstrap", () => {
  it("uses the required Llama 3.3 model id", () => {
    expect(INCIDENT_PILOT_MODEL).toBe(
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    );
  });
});
