import { createWorkersAI } from "workers-ai-provider";
import { callable, type Schedule } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import type { UIMessage } from "ai";
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
import type { NormalizedUserMessage } from "../domain";
import { INCIDENT_PILOT_MODEL } from "../lib/config";
import { createLogger } from "../lib/logger";
import { createAppServices } from "../lib/services";
import { repairWorkersAIToolCall } from "../lib/workers-ai-tool-repair";
import {
  INCIDENT_REMEDIATION_WORKFLOW_BINDING,
  type RemediationWorkflowProgress
} from "../workflows/incidentWorkflow";

export class IncidentPilotAgent extends AIChatAgent<Env, AgentState> {
  maxPersistedMessages = 100;
  chatRecovery = true;
  waitForMcpConnections = false;
  initialState: AgentState = initialAgentState();

  private logger = createLogger();

  onStart() {
    this.logger = createLogger(this.env.LOG_LEVEL);
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

  @callable()
  async handleSlackMessage(message: NormalizedUserMessage) {
    const services = this.getServices();
    const agentInstanceId = `slack:${message.workspaceId ?? "unknown"}:${message.conversationReference}`;

    const context = await ensureAgentContext({
      services,
      state: this.state,
      setState: (state) => this.setState(state),
      agentInstanceId,
      userText: message.content,
      sourceChannel: "slack",
      createdBy: message.userId,
      sourceReference: message.conversationReference
    });

    this.setState({
      ...this.state,
      activeChannel: "slack",
      contextId: context.id,
      contextKey: context.contextKey
    });

    const userMessage: UIMessage = {
      id: message.externalMessageId ?? crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: message.content }]
    };

    const result = await this.saveMessages((messages) => [
      ...messages,
      userMessage
    ]);

    return {
      contextKey: context.contextKey,
      responseStatus: result.status
    };
  }

  private getServices() {
    return createAppServices(this.env);
  }

  async startRemediationWorkflow(input: {
    incidentId: string;
    contextId: string;
    contextKey: string;
    serviceName: string;
    proposedAction: string;
    remediationActionId: string;
  }) {
    const workflowId = await this.runWorkflow(
      INCIDENT_REMEDIATION_WORKFLOW_BINDING,
      {
        ...input,
        agentInstanceId: this.sessionAffinity
      },
      {
        metadata: {
          contextKey: input.contextKey,
          incidentId: input.incidentId,
          remediationActionId: input.remediationActionId
        }
      }
    );

    await this.getServices().remediation.linkWorkflow(
      input.remediationActionId,
      {
        workflowId,
        agentInstanceId: this.sessionAffinity,
        contextKey: input.contextKey
      }
    );

    this.setState({
      ...this.state,
      activeWorkflowId: workflowId,
      pendingApproval: {
        action: input.proposedAction,
        incidentId: input.incidentId,
        workflowId
      }
    });

    this.logger.info("remediation workflow started", {
      workflowId,
      contextKey: input.contextKey,
      incidentId: input.incidentId
    });

    return workflowId;
  }

  async onWorkflowProgress(
    workflowName: string,
    instanceId: string,
    progress: unknown
  ) {
    const p = progress as RemediationWorkflowProgress;
    this.broadcast(
      JSON.stringify({
        type: "workflow-progress",
        workflowName,
        instanceId,
        progress: p
      })
    );
  }

  async onWorkflowComplete(
    workflowName: string,
    instanceId: string,
    result?: unknown
  ) {
    this.logger.info("remediation workflow complete", {
      workflowName,
      workflowId: instanceId,
      contextKey: this.state?.contextKey,
      result
    });
    this.setState({
      ...this.state,
      pendingApproval: undefined,
      activeWorkflowId: undefined
    });
    this.broadcast(
      JSON.stringify({
        type: "workflow-complete",
        workflowName,
        instanceId,
        result
      })
    );
  }

  async onWorkflowError(
    workflowName: string,
    instanceId: string,
    error: string
  ) {
    this.logger.error("remediation workflow failed", {
      workflowName,
      workflowId: instanceId,
      contextKey: this.state?.contextKey,
      error
    });
    this.setState({
      ...this.state,
      pendingApproval: undefined,
      activeWorkflowId: undefined
    });
  }

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const services = this.getServices();
    this.logger = createLogger(this.env.LOG_LEVEL);
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

    const messageChannel = this.state?.activeChannel ?? "web";

    if (userText) {
      await services.context.appendMessage({
        contextId: context.id,
        role: "user",
        content: userText,
        channel: messageChannel
      });
      await services.memory.refreshSummaryFromMessages(context.id);
    }

    const memory = await services.memory.getMemorySnapshot(context.contextKey);
    const operationalTools = createOperationalTools(services, {
      agentContext: {
        contextId: context.id,
        contextKey: context.contextKey,
        agentInstanceId: this.sessionAffinity
      },
      startRemediationWorkflow: (input) => this.startRemediationWorkflow(input)
    });

    const result = streamText({
      model: workersai(INCIDENT_PILOT_MODEL, {
        sessionAffinity: this.sessionAffinity
      }),
      system: buildProductionSystemPrompt({
        contextKey: context.contextKey,
        summary: memory.summary,
        facts: memory.facts
      }),
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
            channel: messageChannel
          });
          await services.memory.refreshSummaryFromMessages(context.id);
        }
      }
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        this.logger.error(
          "chat stream error",
          {
            contextKey: context.contextKey
          },
          error
        );
        return error instanceof Error ? error.message : "An error occurred.";
      }
    });
  }

  async executeTask(description: string, _task: Schedule<string>) {
    this.logger.info("scheduled task executed", { description });
    this.broadcast(
      JSON.stringify({
        type: "scheduled-task",
        description,
        timestamp: new Date().toISOString()
      })
    );
  }
}
