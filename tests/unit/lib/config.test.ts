import {
  DEFAULT_CONTEXT_ID_PREFIX,
  loadServerConfig
} from "../../../src/lib/config";
import { parseContextKey } from "../../../src/lib/ids";
import { describe, expect, it } from "vitest";

describe("loadServerConfig", () => {
  it("accepts valid defaults", () => {
    const config = loadServerConfig({});
    expect(config.contextIdPrefix).toBe(DEFAULT_CONTEXT_ID_PREFIX);
    expect(config.contextSequenceWidth).toBe(3);
  });

  it("rejects invalid context prefix", () => {
    expect(() => loadServerConfig({ CONTEXT_ID_PREFIX: "bad-prefix" })).toThrow(
      /Invalid CONTEXT_ID_PREFIX/
    );
  });
});

describe("parseContextKey", () => {
  it("normalizes case and hash prefix", () => {
    const parsed = parseContextKey("#nwe-016", "NWE");
    expect(parsed.canonicalKey).toBe("NWE-016");
  });

  it("rejects malformed keys", () => {
    expect(() => parseContextKey("NWE", "NWE")).toThrow(/Invalid context key/);
  });
});
