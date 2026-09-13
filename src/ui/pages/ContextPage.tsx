import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Empty, Surface, Text } from "@cloudflare/kumo";
import {
  ArrowLeftIcon,
  ChatCircleDotsIcon,
  ClockIcon,
  HashIcon
} from "@phosphor-icons/react";
import type { ConversationContext } from "../../domain/context";

interface ContextPageProps {
  contextKey: string;
  onBack?: () => void;
}

export function ContextPage({ contextKey, onBack }: ContextPageProps) {
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/context/${encodeURIComponent(contextKey)}`
      );
      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? `Context ${contextKey} not found`
            : `Failed to load context (${response.status})`
        );
      }
      const data = (await response.json()) as ConversationContext;
      setContext(data);
    } catch (err) {
      setContext(null);
      setError(err instanceof Error ? err.message : "Failed to load context");
    } finally {
      setLoading(false);
    }
  }, [contextKey]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Text variant="secondary">Loading context…</Text>
      </div>
    );
  }

  if (error || !context) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Empty
          icon={<HashIcon size={32} />}
          title="Context unavailable"
          contents={
            <div className="space-y-3 text-center">
              <Text size="sm" variant="secondary">
                {error}
              </Text>
              <Button
                variant="secondary"
                icon={<ArrowLeftIcon size={16} />}
                onClick={() =>
                  onBack ? onBack() : (window.location.href = "/")
                }
              >
                Back to chat
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="primary">
              <HashIcon size={12} weight="bold" className="mr-1" />
              {context.contextKey}
            </Badge>
            <Badge variant="secondary">{context.status}</Badge>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<ChatCircleDotsIcon size={14} />}
            onClick={() =>
              onBack
                ? onBack()
                : (window.location.href = `/?context=${context.contextKey}`)
            }
          >
            Open in chat
          </Button>
        </div>

        <Surface className="p-4 rounded-xl ring ring-kumo-line space-y-4">
          <div>
            <Text size="xs" variant="secondary" bold>
              Summary
            </Text>
            <p className="text-sm text-kumo-default mt-1">
              {context.summary || "No summary yet."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Text size="xs" variant="secondary" bold>
                Source
              </Text>
              <p className="text-sm text-kumo-default mt-1 capitalize">
                {context.sourceChannel}
              </p>
            </div>
            <div>
              <Text size="xs" variant="secondary" bold>
                Created by
              </Text>
              <p className="text-sm text-kumo-default mt-1">
                {context.createdBy}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-kumo-subtle">
            <div className="flex items-center gap-1.5">
              <ClockIcon size={14} />
              <Text size="xs" variant="secondary">
                Created {new Date(context.createdAt).toLocaleString()}
              </Text>
            </div>
            <div className="flex items-center gap-1.5">
              <ClockIcon size={14} />
              <Text size="xs" variant="secondary">
                Updated {new Date(context.updatedAt).toLocaleString()}
              </Text>
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}
