import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Surface, Text } from "@cloudflare/kumo";
import {
  CheckCircleIcon,
  ShieldWarningIcon,
  XCircleIcon
} from "@phosphor-icons/react";
import type { AgentState } from "../../agent/state";

export interface PendingApproval {
  id: string;
  action: string;
  contextKey?: string;
  incidentId?: string;
  workflowId?: string;
  description?: string;
  requestedAt?: string;
}

interface ApprovalPanelProps {
  agentState?: AgentState;
  pollIntervalMs?: number;
}

function agentStateToApproval(
  state: AgentState | undefined
): PendingApproval | null {
  if (!state?.pendingApproval) return null;
  const { pendingApproval } = state;
  return {
    id:
      pendingApproval.workflowId ??
      pendingApproval.incidentId ??
      pendingApproval.action,
    action: pendingApproval.action,
    contextKey: state.contextKey,
    incidentId: pendingApproval.incidentId,
    workflowId: pendingApproval.workflowId
  };
}

export function ApprovalPanel({
  agentState,
  pollIntervalMs = 5000
}: ApprovalPanelProps) {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/approvals/pending");
      if (!response.ok) {
        throw new Error(`Failed to load approvals (${response.status})`);
      }
      const data = (await response.json()) as {
        approvals?: PendingApproval[];
      };
      setApprovals(data.approvals ?? []);
      setError(null);
    } catch (err) {
      const fromAgent = agentStateToApproval(agentState);
      if (fromAgent) {
        setApprovals([fromAgent]);
        setError(null);
      } else {
        setApprovals([]);
        setError(
          err instanceof Error ? err.message : "Unable to load approvals"
        );
      }
    } finally {
      setLoading(false);
    }
  }, [agentState]);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchPending, pollIntervalMs]);

  useEffect(() => {
    const fromAgent = agentStateToApproval(agentState);
    if (fromAgent) {
      setApprovals((prev) => {
        if (prev.some((item) => item.id === fromAgent.id)) return prev;
        return [fromAgent, ...prev];
      });
    }
  }, [agentState]);

  const submitDecision = async (id: string, approved: boolean) => {
    setSubmittingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/approvals/${id}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved })
      });
      if (!response.ok) {
        throw new Error(`Decision failed (${response.status})`);
      }
      setApprovals((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <Surface className="p-3 rounded-xl ring ring-kumo-line space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldWarningIcon size={16} className="text-kumo-warning" />
          <Text size="sm" bold>
            Approvals
          </Text>
        </div>
        {approvals.length > 0 && (
          <Badge variant="secondary">{approvals.length}</Badge>
        )}
      </div>

      {error && <span className="text-xs text-kumo-danger">{error}</span>}

      {loading && approvals.length === 0 && (
        <Text size="xs" variant="secondary">
          Checking…
        </Text>
      )}

      {!loading && approvals.length === 0 && !error && (
        <Text size="xs" variant="secondary">
          No pending approvals
        </Text>
      )}

      <div className="space-y-2">
        {approvals.map((approval) => (
          <div
            key={approval.id}
            className="rounded-lg border border-kumo-line p-2.5 space-y-2"
          >
            <div>
              <Text size="sm" bold>
                {approval.action}
              </Text>
              {approval.description && (
                <Text size="xs" variant="secondary">
                  {approval.description}
                </Text>
              )}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {approval.contextKey && (
                  <Badge variant="secondary">{approval.contextKey}</Badge>
                )}
                {approval.incidentId && (
                  <Badge variant="secondary">{approval.incidentId}</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircleIcon size={14} />}
                disabled={submittingId === approval.id}
                onClick={() => submitDecision(approval.id, true)}
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<XCircleIcon size={14} />}
                disabled={submittingId === approval.id}
                onClick={() => submitDecision(approval.id, false)}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}
