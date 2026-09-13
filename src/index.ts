import { routeAgentRequest } from "agents";
import { routeApiRequest } from "./api/routes";
import { loadServerConfigFromEnv } from "./lib/config";
import { isAppError } from "./lib/errors";
import { createLogger } from "./lib/logger";
import { handleSlackInteractions } from "./slack/approvals";
import { handleSlackEvents } from "./slack/handler";

export { IncidentPilotAgent } from "./agent/IncidentPilotAgent";
export { IncidentRemediationWorkflow } from "./workflows/IncidentRemediationWorkflow";

const logger = createLogger();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    try {
      loadServerConfigFromEnv(env);

      const url = new URL(request.url);

      if (url.pathname.startsWith("/api/")) {
        const apiResponse = await routeApiRequest(request, env);
        if (apiResponse) return apiResponse;
      }

      if (url.pathname === "/slack/events") {
        return handleSlackEvents(request, env, ctx);
      }

      if (url.pathname === "/slack/interactions") {
        return handleSlackInteractions(request, env);
      }

      return (
        (await routeAgentRequest(request, env)) ||
        new Response("Not found", { status: 404 })
      );
    } catch (error) {
      if (isAppError(error)) {
        return Response.json(error.toJSON(), { status: error.status });
      }

      logger.error("unhandled worker error", undefined, error);
      return Response.json(
        { code: "INTERNAL_ERROR", message: "Internal server error" },
        { status: 500 }
      );
    }
  }
} satisfies ExportedHandler<Env>;
