import { describe, expect, it } from "vitest";
import {
  ToolTimeoutError,
  withRetry,
  withTimeout
} from "../../../src/lib/reliability";

describe("reliability helpers", () => {
  it("resolves before timeout", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 100)).resolves.toBe("ok");
  });

  it("rejects on timeout", async () => {
    await expect(
      withTimeout(
        new Promise((resolve) => setTimeout(resolve, 200)),
        20,
        "slow-op"
      )
    ).rejects.toBeInstanceOf(ToolTimeoutError);
  });

  it("retries transient failures", async () => {
    let attempts = 0;
    const value = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 2) throw new Error("transient");
        return "done";
      },
      3,
      1
    );
    expect(value).toBe("done");
    expect(attempts).toBe(2);
  });
});
