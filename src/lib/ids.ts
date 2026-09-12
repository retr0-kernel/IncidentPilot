import { ValidationError } from "./errors";

const CONTEXT_REFERENCE_PATTERNS = [
  /(?:^|\s)(?:continue|context|in|from|about|for)\s+#?([A-Za-z]{2,8}-\d{1,6})\b/i,
  /(?:^|\s)#?([A-Za-z]{2,8}-\d{1,6})\b/
];

export interface ParsedContextReference {
  raw: string;
  prefix: string;
  sequence: number;
  canonicalKey: string;
}

export function formatContextKey(
  prefix: string,
  sequence: number,
  width = 3
): string {
  return `${prefix.toUpperCase()}-${String(sequence).padStart(width, "0")}`;
}

export function buildContextKeyPattern(prefix: string): RegExp {
  return new RegExp(`^${prefix.toUpperCase()}-\\d+$`);
}

/**
 * Extract a context key from free-form user text.
 * Returns null when no valid key pattern is found.
 */
export function extractContextKeyFromText(
  text: string,
  prefix: string
): ParsedContextReference | null {
  for (const pattern of CONTEXT_REFERENCE_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;

    try {
      return parseContextKey(match[1], prefix);
    } catch {
      continue;
    }
  }

  return null;
}

export function parseContextKey(
  input: string,
  expectedPrefix: string
): ParsedContextReference {
  const raw = input.trim();
  const normalized = raw.replace(/^#/, "").toUpperCase();
  const match = normalized.match(/^([A-Z]{2,8})-(\d+)$/);

  if (!match) {
    throw new ValidationError(`Invalid context key format: "${input}"`, {
      input
    });
  }

  const [, prefix, sequenceText] = match;
  const expected = expectedPrefix.toUpperCase();

  if (prefix !== expected) {
    throw new ValidationError(`Context key prefix must be ${expected}`, {
      input,
      prefix
    });
  }

  const sequence = Number.parseInt(sequenceText, 10);
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new ValidationError(`Invalid context sequence in "${input}"`, {
      input,
      sequence: sequenceText
    });
  }

  return {
    raw,
    prefix,
    sequence,
    canonicalKey: formatContextKey(prefix, sequence)
  };
}

export function formatIncidentKey(sequence: number): string {
  return `INC-${sequence}`;
}

export function formatWorkflowKey(sequence: number): string {
  return `WF-${sequence}`;
}
