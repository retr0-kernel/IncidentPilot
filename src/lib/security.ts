const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /system\s+prompt/i,
  /<\/?script/i
];

export function assertSafeUserText(text: string, maxLength = 8000): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Empty user message");
  }
  if (trimmed.length > maxLength) {
    throw new Error(`Message exceeds ${maxLength} characters`);
  }
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error("Message contains disallowed content");
    }
  }
  return trimmed;
}

export function isSqlInjectionAttempt(input: string): boolean {
  return /;\s*drop\s+|union\s+select|--/i.test(input);
}
