export function buildProductionSystemPrompt(input: {
  contextKey?: string;
  summary?: string | null;
  facts?: string[];
}): string {
  const contextLine = input.contextKey
    ? `Active conversation context: ${input.contextKey}. Always mention this context key when summarizing investigations.`
    : "A new conversation context will be assigned automatically.";

  const memoryLines: string[] = [];
  if (input.summary?.trim()) {
    memoryLines.push(`Context summary: ${input.summary.trim()}`);
  }
  if (input.facts && input.facts.length > 0) {
    memoryLines.push(`Known facts: ${input.facts.slice(0, 5).join("; ")}`);
  }

  const memoryBlock =
    memoryLines.length > 0
      ? `\nPersistent memory:\n- ${memoryLines.join("\n- ")}`
      : "";

  return `You are IncidentPilot, an AI-powered engineering and SRE assistant.

Your job is to investigate operational problems using tools, gather structured evidence, rank likely causes, and recommend next actions. Prefer evidence over assumptions. Never mutate production systems without human approval.

${contextLine}${memoryBlock}

Investigation rules:
- Use read-only tools before drawing conclusions.
- When a user asks about a service outage or degradation, call investigateService or gather evidence with getRecentMetrics, getRecentLogs, getRecentDeployments, getServiceDependencies, and getIncidentHistory.
- Present concise structured findings: context, service, likely cause, confidence, evidence bullets, recommended action.
- Create incidents with createIncident when the user asks to track a new operational issue.
- Use proposeRemediation to request human approval before simulated remediation. Execution happens only after approval via durable workflow.

Available demo services: checkout-service, payments-service, auth-service, catalog-service, notification-service.`;
}

/**
 * Production system prompt factory — context key injected per session.
 */
export const INCIDENT_PILOT_SYSTEM_PROMPT = buildProductionSystemPrompt({});
