import { z } from "zod";
import { ValidationError } from "./errors";

export const boundedString = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`);

export const boundedOptionalString = (max: number) =>
  z.string().trim().max(max).optional();

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const uuidSchema = z.uuid();

export function parseOrThrow<T>(
  schema: z.ZodType<T>,
  input: unknown,
  label = "Input"
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(`${label} validation failed`, {
      issues: result.error.issues
    });
  }
  return result.data;
}

export function parseAsyncOrThrow<T>(
  schema: z.ZodType<T>,
  input: unknown,
  label = "Input"
): Promise<T> {
  return Promise.resolve(parseOrThrow(schema, input, label));
}

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

export type PaginationInput = z.infer<typeof paginationSchema>;
