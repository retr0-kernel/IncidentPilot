import type { LogLevel } from "./config";

export interface LogContext {
  contextKey?: string;
  incidentId?: string;
  incidentKey?: string;
  workflowId?: string;
  serviceName?: string;
  channel?: string;
  userId?: string;
  [key: string]: unknown;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

export function createLogger(level: LogLevel = "info") {
  const levels: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40
  };
  const minLevel = levels[level] ?? 20;

  function write(
    severity: LogLevel,
    message: string,
    context?: LogContext,
    error?: unknown
  ) {
    if (levels[severity] < minLevel) return;
    const entry = {
      ts: new Date().toISOString(),
      severity,
      message,
      ...context,
      ...(error ? { error: serializeError(error) } : {})
    };
    const line = JSON.stringify(entry);
    if (severity === "error") console.error(line);
    else if (severity === "warn") console.warn(line);
    else console.log(line);
  }

  return {
    debug: (message: string, context?: LogContext) =>
      write("debug", message, context),
    info: (message: string, context?: LogContext) =>
      write("info", message, context),
    warn: (message: string, context?: LogContext, error?: unknown) =>
      write("warn", message, context, error),
    error: (message: string, context?: LogContext, error?: unknown) =>
      write("error", message, context, error)
  };
}

export type Logger = ReturnType<typeof createLogger>;
