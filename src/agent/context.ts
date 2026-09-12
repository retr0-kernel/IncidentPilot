import type { ConversationContext } from "../domain/context";
import type { ContextService } from "../domain/context-service";

export interface ContextResolver {
  resolveContextKey(contextKey: string): Promise<ConversationContext>;
}

export class D1ContextResolver implements ContextResolver {
  constructor(private readonly contextService: ContextService) {}

  resolveContextKey(contextKey: string): Promise<ConversationContext> {
    return this.contextService.resolveContextKey(contextKey);
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
  return match[0].toUpperCase();
}
