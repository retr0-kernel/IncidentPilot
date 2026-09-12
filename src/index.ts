import { routeAgentRequest } from "agents";
import { loadServerConfigFromEnv } from "./lib/config";
import { isAppError } from "./lib/errors";
import { handleSlackEvent } from "./slack/handler";

export { IncidentPilotAgent } from "./agent/IncidentPilotAgent";

export default {
  async fetch(request: Request, env: Env) {
    try {
      loadServerConfigFromEnv(env);

      const url = new URL(request.url);

      if (url.pathname.startsWith("/slack/")) {
        return handleSlackEvent(request);
      }

      return (
        (await routeAgentRequest(request, env)) ||
        new Response("Not found", { status: 404 })
      );
    } catch (error) {
      if (isAppError(error)) {
        return Response.json(error.toJSON(), { status: error.status });
      }

      console.error("Unhandled worker error", error);
      return Response.json(
        { code: "INTERNAL_ERROR", message: "Internal server error" },
        { status: 500 }
      );
    }
  }
} satisfies ExportedHandler<Env>;
