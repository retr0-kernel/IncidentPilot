import { getAgentByName } from "agents";
import type { IncidentPilotAgent } from "../agent/IncidentPilotAgent";
import { createAppServices } from "../lib/services";
import { assertCanApprove, parseActor } from "../lib/auth";
import { createLogger } from "../lib/logger";
import { ForbiddenError, isAppError, ValidationError } from "../lib/errors";
import type { RemediationLinkMetadata } from "../domain/remediation-service";

const logger = createLogger();

function parseLinkMetadata(
  result: Record<string, unknown> | null
): RemediationLinkMetadata | null {
  if (
    result &&
    typeof result.workflowId === "string" &&
    typeof result.agentInstanceId === "string"
  ) {
    return result as unknown as RemediationLinkMetadata;
  }
  return null;
}

export async function handleGetContext(
  request: Request,
  env: Env,
  contextKey: string
): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const services = createAppServices(env);
  const snapshot = await services.memory.getMemorySnapshot(contextKey);
  const context = await services.context.getContextByKey(contextKey);

  return Response.json({
    ...context,
    facts: snapshot.facts,
    recentMessages: snapshot.recentMessages
  });
}

export async function handleListPendingApprovals(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  parseActor(request);
  const services = createAppServices(env);
  const rows = await services.remediation.listPendingApprovals();

  const approvals = rows.map((row) => {
    let result: Record<string, unknown> | null = null;
    if (row.result) {
      try {
        result = JSON.parse(row.result) as Record<string, unknown>;
      } catch {
        result = null;
      }
    }
    const link = parseLinkMetadata(result);
    return {
      id: row.id,
      action: row.action,
      incidentId: row.incident_id,
      workflowId: link?.workflowId,
      contextKey: link?.contextKey,
      requestedAt: row.started_at ?? undefined,
      description: `Awaiting approval for ${row.action}`
    };
  });

  return Response.json({ approvals });
}

export async function handleApprovalDecision(
  request: Request,
  env: Env,
  remediationId: string
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const actor = parseActor(request);
  assertCanApprove(actor);

  const body = (await request.json()) as { approved?: boolean };
  if (typeof body.approved !== "boolean") {
    throw new ValidationError("Request body must include approved: boolean");
  }

  const services = createAppServices(env);
  const remediation = await services.remediation.getById(remediationId);

  if (remediation.status !== "awaiting_approval") {
    throw new ForbiddenError("Remediation is no longer awaiting approval", {
      remediationId,
      status: remediation.status
    });
  }

  const link = parseLinkMetadata(remediation.result);
  if (!link?.workflowId || !link.agentInstanceId) {
    throw new ValidationError(
      "Remediation is not linked to an active workflow",
      { remediationId }
    );
  }

  const agent = await getAgentByName<Env, IncidentPilotAgent>(
    env.IncidentPilotAgent,
    link.agentInstanceId
  );

  if (body.approved) {
    await agent.approveWorkflow(link.workflowId, {
      metadata: { approvedBy: actor.userId, source: "web" }
    });
    await services.remediation.markApproved(remediationId, actor.userId);
    logger.info("remediation approved", {
      remediationId,
      workflowId: link.workflowId,
      userId: actor.userId
    });
  } else {
    await agent.rejectWorkflow(link.workflowId, {
      reason: `Rejected by ${actor.userId} via web`
    });
    await services.remediation.markRejected(remediationId, actor.userId);
    logger.info("remediation rejected", {
      remediationId,
      workflowId: link.workflowId,
      userId: actor.userId
    });
  }

  return Response.json({ ok: true, approved: body.approved });
}

export async function routeApiRequest(
  request: Request,
  env: Env
): Promise<Response | null> {
  const url = new URL(request.url);

  const contextMatch = url.pathname.match(/^\/api\/context\/([^/]+)$/);
  if (contextMatch) {
    try {
      return await handleGetContext(
        request,
        env,
        decodeURIComponent(contextMatch[1]).toUpperCase()
      );
    } catch (error) {
      if (isAppError(error)) {
        return Response.json(error.toJSON(), { status: error.status });
      }
      throw error;
    }
  }

  if (url.pathname === "/api/approvals/pending") {
    try {
      return await handleListPendingApprovals(request, env);
    } catch (error) {
      if (isAppError(error)) {
        return Response.json(error.toJSON(), { status: error.status });
      }
      throw error;
    }
  }

  const decisionMatch = url.pathname.match(
    /^\/api\/approvals\/([^/]+)\/decision$/
  );
  if (decisionMatch) {
    try {
      return await handleApprovalDecision(
        request,
        env,
        decodeURIComponent(decisionMatch[1])
      );
    } catch (error) {
      if (isAppError(error)) {
        return Response.json(error.toJSON(), { status: error.status });
      }
      throw error;
    }
  }

  return null;
}
