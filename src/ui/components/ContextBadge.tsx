import { useEffect, useState } from "react";
import { Badge, Text } from "@cloudflare/kumo";
import { HashIcon } from "@phosphor-icons/react";
import type { IncidentPilotAgent } from "../../agent/IncidentPilotAgent";
import type { AgentState } from "../../agent/state";
import type { useAgent } from "agents/react";

type AgentConnection = ReturnType<
  typeof useAgent<IncidentPilotAgent, AgentState>
>;

interface ContextBadgeProps {
  agent: AgentConnection;
  connected: boolean;
}

export function ContextBadge({ agent, connected }: ContextBadgeProps) {
  const [contextKey, setContextKey] = useState<string | undefined>(
    agent.state?.contextKey
  );

  useEffect(() => {
    setContextKey(agent.state?.contextKey);
  }, [agent.state?.contextKey]);

  useEffect(() => {
    if (!connected) {
      setContextKey(undefined);
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      try {
        const key = await agent.call("getActiveContextKey");
        if (!cancelled) setContextKey(key);
      } catch {
        // Ignore transient connection errors during polling.
      }
    };

    refresh();
    const interval = setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [agent, connected]);

  if (!contextKey) {
    return (
      <Badge variant="secondary">
        <HashIcon size={12} weight="bold" className="mr-1" />
        No context
      </Badge>
    );
  }

  return (
    <a href={`/context/${contextKey}`} className="no-underline">
      <Badge variant="primary" className="hover:opacity-90 transition-opacity">
        <HashIcon size={12} weight="bold" className="mr-1" />
        <Text size="xs" as="span" bold>
          {contextKey}
        </Text>
      </Badge>
    </a>
  );
}
