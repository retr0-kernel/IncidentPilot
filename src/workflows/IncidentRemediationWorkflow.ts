import { AgentWorkflow } from "agents/workflows";
import type { AgentWorkflowEvent, AgentWorkflowStep } from "agents/workflows";
import type { IncidentPilotAgent } from "../agent/IncidentPilotAgent";
import { createAppServices } from "../lib/services";
import { createLogger } from "../lib/logger";
import type {
  IncidentWorkflowParams,
  RemediationWorkflowProgress
} from "./incidentWorkflow";

export class IncidentRemediationWorkflow extends AgentWorkflow<
  IncidentPilotAgent,
  IncidentWorkflowParams,
  RemediationWorkflowProgress
> {
  async run(
    event: AgentWorkflowEvent<IncidentWorkflowParams>,
    step: AgentWorkflowStep
  ) {
    const params = event.payload;
    const services = createAppServices(this.env);
    const logger = createLogger(this.env.LOG_LEVEL);

    logger.info("remediation workflow started", {
      workflowId: this.workflowId,
      incidentId: params.incidentId,
      contextKey: params.contextKey,
      serviceName: params.serviceName
    });

    await this.reportProgress({
      step: "initialize",
      status: "running",
      detail: "Starting investigation phase"
    });

    await step.do("initialize-incident", async () => {
      await services.incidents.startInvestigation(
        params.incidentId,
        "incident-remediation-workflow"
      );
      await services.remediation.trackWorkflow({
        workflowId: this.workflowId,
        workflowKey: `WF-${params.incidentId.slice(0, 8)}`,
        incidentId: params.incidentId,
        contextId: params.contextId,
        status: "running",
        metadata: {
          proposedAction: params.proposedAction,
          remediationActionId: params.remediationActionId,
          contextKey: params.contextKey
        }
      });
    });

    await this.reportProgress({
      step: "approval",
      status: "pending",
      detail: "Waiting for human approval"
    });

    await step.mergeAgentState({
      pendingApproval: {
        action: params.proposedAction,
        incidentId: params.incidentId,
        workflowId: this.workflowId
      },
      activeWorkflowId: this.workflowId
    });

    const approval = await this.waitForApproval<{ approvedBy?: string }>(step, {
      timeout: "7 days",
      stepName: "human-approval"
    });

    await step.do("record-approval", async () => {
      await services.remediation.markApproved(
        params.remediationActionId,
        approval?.approvedBy ?? "approver"
      );
      await services.incidents.transitionStatus({
        incidentId: params.incidentId,
        nextStatus: "REMEDIATING",
        actorType: "user",
        actorId: approval?.approvedBy ?? "approver",
        sourceChannel: "workflow",
        eventType: "APPROVAL_GRANTED",
        metadata: { workflowId: this.workflowId }
      });
    });

    await this.reportProgress({
      step: "remediation",
      status: "running",
      detail: "Executing simulated remediation"
    });

    const execution = await step.do("execute-remediation", async () => {
      const result = await services.remediation.simulateExecute({
        remediationId: params.remediationActionId,
        serviceName: params.serviceName,
        action: params.proposedAction
      });
      return {
        simulated: result.simulated,
        serviceName: result.serviceName,
        action: result.action,
        healthRecovered: result.healthRecovered,
        verificationResult: result.verificationResult,
        currentDeployment: String(result.details.currentDeployment ?? ""),
        status: String(result.details.status ?? "")
      };
    });

    await step.sleep("stabilize", "5 seconds");

    const verification = await step.do("verify-health", async () =>
      services.remediation.verifyService(
        params.serviceName,
        params.proposedAction
      )
    );

    await step.do("finalize-incident", async () => {
      await services.remediation.finalizeIncident(
        params.incidentId,
        verification
      );
      await services.remediation.trackWorkflow({
        workflowId: this.workflowId,
        workflowKey: `WF-${params.incidentId.slice(0, 8)}`,
        incidentId: params.incidentId,
        contextId: params.contextId,
        status: verification === "NOT_RESOLVED" ? "failed" : "complete",
        metadata: { execution, verification }
      });
    });

    await step.mergeAgentState({
      pendingApproval: undefined,
      activeWorkflowId: undefined
    });

    await this.reportProgress({
      step: "finalize",
      status: verification === "NOT_RESOLVED" ? "failed" : "complete",
      detail: `Verification: ${verification}`,
      verification
    });

    this.broadcastToClients({
      type: "workflow-complete",
      workflowId: this.workflowId,
      contextKey: params.contextKey,
      verification,
      execution
    });

    await step.reportComplete({ verification, execution });
    return { verification, execution };
  }
}
