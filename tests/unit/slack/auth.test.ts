import {
  computeSlackSignature,
  verifySlackRequest
} from "../../../src/slack/auth";
import { UnauthorizedError } from "../../../src/lib/errors";
import { describe, expect, it } from "vitest";

describe("verifySlackRequest", () => {
  it("skips verification when signing secret is missing", async () => {
    const request = new Request("https://example.com/slack/events", {
      method: "POST",
      body: "{}"
    });

    await expect(
      verifySlackRequest(request, "{}", { signingSecret: undefined })
    ).resolves.toBeUndefined();
  });

  it("accepts a valid signature", async () => {
    const secret = "test-signing-secret";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({ type: "event_callback" });
    const signature = await computeSlackSignature(secret, timestamp, body);

    const request = new Request("https://example.com/slack/events", {
      method: "POST",
      headers: {
        "X-Slack-Request-Timestamp": timestamp,
        "X-Slack-Signature": signature
      },
      body
    });

    await expect(
      verifySlackRequest(request, body, { signingSecret: secret })
    ).resolves.toBeUndefined();
  });

  it("rejects an invalid signature", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = "{}";
    const request = new Request("https://example.com/slack/events", {
      method: "POST",
      headers: {
        "X-Slack-Request-Timestamp": timestamp,
        "X-Slack-Signature": "v0=deadbeef"
      },
      body
    });

    await expect(
      verifySlackRequest(request, body, { signingSecret: "secret" })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects stale timestamps", async () => {
    const secret = "test-signing-secret";
    const timestamp = String(Math.floor(Date.now() / 1000) - 600);
    const body = "{}";
    const signature = await computeSlackSignature(secret, timestamp, body);
    const request = new Request("https://example.com/slack/events", {
      method: "POST",
      headers: {
        "X-Slack-Request-Timestamp": timestamp,
        "X-Slack-Signature": signature
      },
      body
    });

    await expect(
      verifySlackRequest(request, body, { signingSecret: secret })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
