import { getAgentByName } from "agents";
import type { IncidentPilotAgent } from "../agent/IncidentPilotAgent";
import { ValidationError } from "../lib/errors";
import { verifySlackRequest } from "./auth";

interface SlackInteractionPayload {
  type: string;
  user?: { id?: string };
  team?: { id?: string };
  channel?: { id?: string };
  message?: { thread_ts?: string; ts?: string };
  actions?: Array<{ action_id?: string; value?: string }>;
}

export async function handleSlackInteractions(
  request: Request,
  env: Env
): Promise<Response> {
  const rawBody = await request.text();
  await verifySlackRequest(request, rawBody, {
    signingSecret: env.SLACK_SIGNING_SECRET
  });

  const payload = JSON.parse(rawBody) as SlackInteractionPayload;
  if (payload.type !== "block_actions") {
    return new Response("Unsupported interaction type", { status: 400 });
  }

  const action = payload.actions?.[0];
  const workflowId = action?.value?.trim();
  const actorId = payload.user?.id;
  const workspaceId = payload.team?.id;

  if (!action?.action_id || !workflowId || !actorId || !workspaceId) {
    throw new ValidationError("Invalid Slack approval interaction payload");
  }

  const conversationReference =
    payload.message?.thread_ts ?? payload.message?.ts ?? payload.channel?.id;
  if (!conversationReference) {
    throw new ValidationError(
      "Slack approval interaction is missing conversation reference"
    );
  }

  const agentName = `slack:${workspaceId}:${conversationReference}`;
  const agent = await getAgentByName<Env, IncidentPilotAgent>(
    env.IncidentPilotAgent,
    agentName
  );

  if (action.action_id === "approve_remediation") {
    await agent.approveWorkflow(workflowId, {
      metadata: { approvedBy: actorId, source: "slack" }
    });
    return Response.json({
      response_type: "ephemeral",
      text: `Approved remediation for ${workflowId}.`
    });
  }

  if (action.action_id === "reject_remediation") {
    await agent.rejectWorkflow(workflowId, {
      reason: `Rejected by ${actorId} via Slack`
    });
    return Response.json({
      response_type: "ephemeral",
      text: `Rejected remediation for ${workflowId}.`
    });
  }

  throw new ValidationError(`Unknown Slack action: ${action.action_id}`);
}
