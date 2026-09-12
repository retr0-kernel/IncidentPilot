import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("IncidentPilot worker bootstrap", () => {
  it("returns 404 for unknown routes", async () => {
    const response = await exports.default.fetch(
      new Request("http://example.com/unknown")
    );
    expect(response.status).toBe(404);
  });

  it("exports the IncidentPilotAgent durable object class", async () => {
    expect(exports.IncidentPilotAgent).toBeDefined();
  });
});
