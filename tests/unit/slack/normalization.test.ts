import {
  isUrlVerification,
  normalizeSlackEvent,
  stripBotMention
} from "../../../src/slack/normalization";
import { describe, expect, it } from "vitest";

describe("isUrlVerification", () => {
  it("detects url_verification payloads", () => {
    expect(
      isUrlVerification({ type: "url_verification", challenge: "abc123" })
    ).toBe(true);
    expect(isUrlVerification({ type: "event_callback" })).toBe(false);
  });
});

describe("normalizeSlackEvent", () => {
  it("normalizes app_mention with context key and thread reference", () => {
    const normalized = normalizeSlackEvent(
      {
        type: "event_callback",
        team_id: "T123",
        event: {
          type: "app_mention",
          user: "U123",
          text: "<@BOT123> continue NWE-016 checkout is failing",
          ts: "1700000001.000200",
          thread_ts: "1700000000.000100",
          channel: "C123"
        }
      },
      "NWE"
    );

    expect(normalized).toEqual({
      channel: "slack",
      userId: "U123",
      workspaceId: "T123",
      conversationReference: "1700000000.000100",
      externalMessageId: "1700000001.000200",
      contextKey: "NWE-016",
      content: "continue NWE-016 checkout is failing"
    });
  });

  it("uses message ts when thread_ts is absent", () => {
    const normalized = normalizeSlackEvent(
      {
        type: "event_callback",
        team_id: "T123",
        event: {
          type: "message",
          user: "U123",
          text: "Investigate checkout-service",
          ts: "1700000002.000300",
          channel: "C123"
        }
      },
      "NWE"
    );

    expect(normalized?.conversationReference).toBe("1700000002.000300");
    expect(normalized?.contextKey).toBeUndefined();
  });

  it("ignores bot messages and unsupported subtypes", () => {
    expect(
      normalizeSlackEvent(
        {
          type: "event_callback",
          team_id: "T123",
          event: {
            type: "message",
            subtype: "bot_message",
            text: "hello",
            ts: "1.0"
          }
        },
        "NWE"
      )
    ).toBeNull();

    expect(
      normalizeSlackEvent(
        {
          type: "event_callback",
          team_id: "T123",
          event: {
            type: "message",
            bot_id: "B123",
            text: "hello",
            ts: "1.0"
          }
        },
        "NWE"
      )
    ).toBeNull();
  });
});

describe("stripBotMention", () => {
  it("removes leading bot mentions", () => {
    expect(stripBotMention("<@U123> continue NWE-016")).toBe(
      "continue NWE-016"
    );
  });
});
