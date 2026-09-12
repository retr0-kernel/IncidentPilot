import type { ConversationContext } from "../domain/context";
import { NotFoundError } from "../lib/errors";
import { parseContextKey } from "../lib/ids";

export interface ContextResolver {
  resolveContextKey(contextKey: string): Promise<ConversationContext>;
}

/**
 * Skeleton resolver — D1-backed implementation arrives in TASK 4.
 */
export class InMemoryContextResolver implements ContextResolver {
  constructor(
    private readonly prefix: string,
    private readonly contexts = new Map<string, ConversationContext>()
  ) {}

  async resolveContextKey(contextKey: string): Promise<ConversationContext> {
    const parsed = parseContextKey(contextKey, this.prefix);
    const context = this.contexts.get(parsed.canonicalKey);

    if (!context) {
      throw new NotFoundError(`Context not found: ${parsed.canonicalKey}`, {
        contextKey: parsed.canonicalKey
      });
    }

    return context;
  }
}

export function normalizeContextReference(
  text: string,
  prefix: string
): string | null {
  const match = text.match(
    new RegExp(`\\b${prefix.toUpperCase()}-\\d+\\b`, "i")
  );
  if (!match) return null;
  return parseContextKey(match[0], prefix).canonicalKey;
}
