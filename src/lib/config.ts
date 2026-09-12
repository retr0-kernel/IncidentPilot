export const INCIDENT_PILOT_MODEL =
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as const;

export const DEFAULT_CONTEXT_ID_PREFIX = "NWE" as const;

export const DEFAULT_CONTEXT_SEQUENCE_WIDTH = 3;

export const DEFAULT_LOG_LEVEL = "info" as const;

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface ServerConfig {
  contextIdPrefix: string;
  contextSequenceWidth: number;
  logLevel: LogLevel;
}

export interface ServerConfigInput {
  CONTEXT_ID_PREFIX?: string;
  CONTEXT_SEQUENCE_WIDTH?: string;
  LOG_LEVEL?: string;
}

/**
 * Validates Worker-visible configuration at startup.
 * D1 and Slack bindings are validated separately when first used.
 */
export function loadServerConfig(input: ServerConfigInput = {}): ServerConfig {
  const contextIdPrefix = (
    input.CONTEXT_ID_PREFIX ?? DEFAULT_CONTEXT_ID_PREFIX
  ).trim();

  if (!/^[A-Z]{2,8}$/.test(contextIdPrefix)) {
    throw new Error(
      `Invalid CONTEXT_ID_PREFIX "${contextIdPrefix}". Use 2-8 uppercase letters (e.g. NWE).`
    );
  }

  const widthRaw = input.CONTEXT_SEQUENCE_WIDTH;
  const contextSequenceWidth = widthRaw
    ? Number.parseInt(widthRaw, 10)
    : DEFAULT_CONTEXT_SEQUENCE_WIDTH;

  if (
    !Number.isInteger(contextSequenceWidth) ||
    contextSequenceWidth < 1 ||
    contextSequenceWidth > 6
  ) {
    throw new Error(
      `Invalid CONTEXT_SEQUENCE_WIDTH "${widthRaw}". Use an integer between 1 and 6.`
    );
  }

  const logLevel = (input.LOG_LEVEL ?? DEFAULT_LOG_LEVEL) as LogLevel;
  if (!["debug", "info", "warn", "error"].includes(logLevel)) {
    throw new Error(`Invalid LOG_LEVEL "${input.LOG_LEVEL}".`);
  }

  return {
    contextIdPrefix,
    contextSequenceWidth,
    logLevel
  };
}

export function loadServerConfigFromEnv(env: Env): ServerConfig {
  return loadServerConfig({
    CONTEXT_ID_PREFIX: env.CONTEXT_ID_PREFIX,
    CONTEXT_SEQUENCE_WIDTH: env.CONTEXT_SEQUENCE_WIDTH,
    LOG_LEVEL: env.LOG_LEVEL
  });
}
