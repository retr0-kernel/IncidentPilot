export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFIGURATION_ERROR"
  | "INTERNAL_ERROR";

export interface ErrorDetails {
  [key: string]: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ErrorDetails;
  readonly cause?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      status?: number;
      details?: ErrorDetails;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = options?.status ?? statusForCode(code);
    this.details = options?.details;
    this.cause = options?.cause;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super("VALIDATION_ERROR", message, { status: 400, details });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super("NOT_FOUND", message, { status: 404, details });
    this.name = "NotFoundError";
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super("CONFIGURATION_ERROR", message, { status: 500, details });
    this.name = "ConfigurationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super("UNAUTHORIZED", message, { status: 401, details });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super("FORBIDDEN", message, { status: 403, details });
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super("CONFLICT", message, { status: 409, details });
    this.name = "ConflictError";
  }
}

function statusForCode(code: ErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "CONFIGURATION_ERROR":
      return 500;
    case "INTERNAL_ERROR":
    default:
      return 500;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
