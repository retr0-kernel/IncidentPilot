import {
  InvalidToolInputError,
  type ToolCallRepairFunction,
  type ToolSet
} from "ai";

/**
 * Workers AI can emit the same tool-call arguments twice in one SSE chunk
 * (native `tool_calls` plus OpenAI `choices[].delta.tool_calls`), which
 * produces nested invalid JSON such as:
 *   {"city": "{"city": "Paris"}Paris"}
 */
export function repairWorkersAIToolInput(raw: string): string | null {
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    // fall through
  }

  const matches = [...raw.matchAll(/"city"\s*:\s*"([A-Za-z][A-Za-z\s-]*)"/g)];
  if (matches.length > 0) {
    const city = matches[matches.length - 1][1]?.trim();
    if (city) return JSON.stringify({ city });
  }

  return null;
}

export const repairWorkersAIToolCall: ToolCallRepairFunction<ToolSet> = async ({
  toolCall,
  error
}) => {
  if (!InvalidToolInputError.isInstance(error)) return null;
  if (typeof toolCall.input !== "string") return null;

  const repaired = repairWorkersAIToolInput(toolCall.input);
  if (!repaired) return null;

  return { ...toolCall, input: repaired };
};
