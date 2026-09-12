import { ConfigurationError, NotFoundError } from "../../../src/lib/errors";
import { ContextService } from "../../../src/domain/context-service";
import { describe, expect, it, vi } from "vitest";

describe("ContextService errors", () => {
  it("throws NotFoundError for missing context", async () => {
    const service = new ContextService(
      {
        getContextByKey: vi.fn().mockResolvedValue(null)
      } as never,
      { contextIdPrefix: "NWE", contextSequenceWidth: 3 }
    );

    await expect(service.resolveContextKey("NWE-999")).rejects.toBeInstanceOf(
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
