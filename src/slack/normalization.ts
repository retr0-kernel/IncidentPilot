import type { NormalizedUserMessage } from "../domain";
import { ValidationError } from "../lib/errors";
import { extractContextKeyFromText } from "../lib/ids";

export interface SlackUrlVerification {
  type: "url_verification";
  challenge: string;
}

export interface SlackEventEnvelope {
  type: string;
  token?: string;
  team_id?: string;
  api_app_id?: string;
  event_id?: string;
  event?: SlackEventPayload;
  challenge?: string;
}

export interface SlackEventPayload {
  type: string;
  user?: string;
  text?: string;
  ts?: string;
  thread_ts?: string;
  channel?: string;
  channel_type?: string;
  bot_id?: string;
  subtype?: string;
  team?: string;
}

export function isUrlVerification(
  payload: SlackEventEnvelope
): payload is SlackUrlVerification {
  return payload.type === "url_verification" && Boolean(payload.challenge);
}

export function normalizeSlackEvent(
  payload: SlackEventEnvelope,
  contextIdPrefix: string
): NormalizedUserMessage | null {
  const event = payload.event;
  if (!event) return null;

  if (event.type !== "app_mention" && event.type !== "message") {
    return null;
  }

  if (event.subtype && event.subtype !== "file_share") {
    return null;
  }

  if (event.bot_id) {
    return null;
  }

  const text = event.text?.trim();
  if (!text) {
    return null;
  }

  const workspaceId = payload.team_id ?? event.team;
  const conversationReference = event.thread_ts ?? event.ts ?? event.channel;
  if (!conversationReference) {
    throw new ValidationError(
      "Slack event is missing a conversation reference"
    );
  }

  const referenced = extractContextKeyFromText(text, contextIdPrefix);

  return {
    channel: "slack",
    userId: event.user ?? "unknown",
    workspaceId,
    conversationReference,
    externalMessageId: event.ts,
    contextKey: referenced?.canonicalKey,
    content: stripBotMention(text)
  };
}

export function stripBotMention(text: string): string {
  return text.replace(/<@[A-Z0-9]+>/g, "").trim();
}
