import type { NormalizedUserMessage } from "../domain";

/**
 * Slack Events API adapter — implemented in TASK 13.
 */
export async function handleSlackEvent(_request: Request): Promise<Response> {
  return new Response("Slack adapter not configured", { status: 501 });
}

export function normalizeSlackMessage(
  _payload: unknown
): NormalizedUserMessage {
  throw new Error("Slack normalization is not implemented yet");
}
