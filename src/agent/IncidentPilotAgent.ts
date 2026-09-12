import { createWorkersAI } from "workers-ai-provider";
import { callable, type Schedule } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
  tool
} from "ai";
import { z } from "zod";
import { buildProductionSystemPrompt } from "./prompts";
import { ensureAgentContext, extractLatestUserText } from "./session";
import { initialAgentState, type AgentState } from "./state";
import { createOperationalTools } from "./tools";
import { INCIDENT_PILOT_MODEL } from "../lib/config";
import { createAppServices } from "../lib/services";
import { repairWorkersAIToolCall } from "../lib/workers-ai-tool-repair";

export class IncidentPilotAgent extends AIChatAgent<Env, AgentState> {
  maxPersistedMessages = 100;
  chatRecovery = true;
  waitForMcpConnections = false;
  initialState: AgentState = initialAgentState();

  onStart() {
    this.mcp.configureOAuthCallback({
      customHandler: (result) => {
        if (result.authSuccess) {
          return new Response("<script>window.close();</script>", {
            headers: { "content-type": "text/html" },
            status: 200
          });
        }
        return new Response(
          `Authentication Failed: ${result.authError || "Unknown error"}`,
          { headers: { "content-type": "text/plain" }, status: 400 }
        );
      }
    });
  }

  @callable()
  async addServer(name: string, url: string) {
    return await this.addMcpServer(name, url);
  }

  @callable()
  async removeServer(serverId: string) {
    await this.removeMcpServer(serverId);
  }

  @callable()
  getActiveContextKey(): string | undefined {
    return this.state?.contextKey;
  }

  private getServices() {
    return createAppServices(this.env);
  }

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const services = this.getServices();
    const mcpTools = this.mcp.getAITools();
    const workersai = createWorkersAI({ binding: this.env.AI });
    const userText = extractLatestUserText(this.messages);
    const context = await ensureAgentContext({
      services,
      state: this.state,
      setState: (state) => this.setState(state),
      agentInstanceId: this.sessionAffinity,
      userText
    });

    if (userText) {
      await services.context.appendMessage({
        contextId: context.id,
        role: "user",
        content: userText,
        channel: "web"
      });
    }

    const operationalTools = createOperationalTools(services);

    const result = streamText({
      model: workersai(INCIDENT_PILOT_MODEL, {
        sessionAffinity: this.sessionAffinity
      }),
      system: buildProductionSystemPrompt(context.contextKey),
      messages: pruneMessages({
        messages: await convertToModelMessages(this.messages),
        toolCalls: "before-last-2-messages",
        reasoning: "before-last-message"
      }),
      tools: {
        ...mcpTools,
        ...operationalTools,
        getUserTimezone: tool({
          description:
            "Get the user's timezone from their browser. Use this when you need to know the user's local time.",
          inputSchema: z.object({})
        })
      },
      experimental_repairToolCall: repairWorkersAIToolCall,
      stopWhen: stepCountIs(20),
      abortSignal: options?.abortSignal,
      onFinish: async ({ text }) => {
        if (text?.trim()) {
          await services.context.appendMessage({
            contextId: context.id,
            role: "assistant",
            content: text,
            channel: "web"
          });
        }
      }
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error("[IncidentPilotAgent] chat stream error:", error);
        return error instanceof Error ? error.message : "An error occurred.";
      }
    });
  }

  async executeTask(description: string, _task: Schedule<string>) {
    console.log(`Executing scheduled task: ${description}`);
    this.broadcast(
      JSON.stringify({
        type: "scheduled-task",
        description,
        timestamp: new Date().toISOString()
      })
    );
  }
}
