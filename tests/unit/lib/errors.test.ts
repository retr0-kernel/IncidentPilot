import { ConfigurationError, NotFoundError } from "../../../src/lib/errors";
import { InMemoryContextResolver } from "../../../src/agent/context";
import { describe, expect, it } from "vitest";

describe("InMemoryContextResolver", () => {
  it("throws NotFoundError for missing context", async () => {
    const resolver = new InMemoryContextResolver("NWE");
    await expect(resolver.resolveContextKey("NWE-999")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});

describe("ConfigurationError", () => {
  it("serializes to JSON", () => {
    const error = new ConfigurationError('D1 binding "DB" is not configured');
    expect(error.toJSON()).toMatchObject({
      code: "CONFIGURATION_ERROR"
    });
  });
});
