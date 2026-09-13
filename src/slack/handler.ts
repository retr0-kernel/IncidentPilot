import { getAgentByName } from "agents";
import type { IncidentPilotAgent } from "../agent/IncidentPilotAgent";
import type { NormalizedUserMessage } from "../domain";
import { createQueryRunner, getDatabase } from "../db/client";
import { SlackRepository } from "../db/queries/slack";
import { loadServerConfigFromEnv } from "../lib/config";
import { ValidationError } from "../lib/errors";
import { verifySlackRequest } from "./auth";
import {
  isUrlVerification,
  normalizeSlackEvent,
  type SlackEventEnvelope
} from "./normalization";

export function buildSlackAgentName(
  workspaceId: string,
  conversationReference: string
): string {
  return `slack:${workspaceId}:${conversationReference}`;
}

export async function handleSlackEvents(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const rawBody = await request.text();
  await verifySlackRequest(request, rawBody, {
    signingSecret: env.SLACK_SIGNING_SECRET
  });

  const payload = JSON.parse(rawBody) as SlackEventEnvelope;

  if (isUrlVerification(payload)) {
    return Response.json({ challenge: payload.challenge });
  }

  if (payload.type !== "event_callback") {
    throw new ValidationError(
      `Unsupported Slack payload type: ${payload.type}`
    );
  }

  const eventId = payload.event_id;
  const workspaceId = payload.team_id;
  if (!eventId || !workspaceId) {
    throw new ValidationError(
      "Slack event_callback is missing event_id or team_id"
    );
  }

  const slackRepo = new SlackRepository(createQueryRunner(getDatabase(env)));
  if (await slackRepo.hasProcessedEvent(eventId)) {
    return new Response(null, { status: 200 });
  }

  const config = loadServerConfigFromEnv(env);
  const normalized = normalizeSlackEvent(payload, config.contextIdPrefix);
  if (!normalized) {
    await slackRepo.recordProcessedEvent(eventId, workspaceId);
    return new Response(null, { status: 200 });
  }

  ctx.waitUntil(
    processSlackMessage(env, normalized).catch((error) => {
      console.error("[slack] Failed to process event", error);
    })
  );

  await slackRepo.recordProcessedEvent(eventId, workspaceId);
  return new Response(null, { status: 200 });
}

async function processSlackMessage(
  env: Env,
  message: NormalizedUserMessage
): Promise<void> {
  const workspaceId = message.workspaceId ?? "unknown";
  const agentName = buildSlackAgentName(
    workspaceId,
    message.conversationReference
  );
  const agent = await getAgentByName<Env, IncidentPilotAgent>(
    env.IncidentPilotAgent,
    agentName
  );
  await agent.handleSlackMessage(message);
}
