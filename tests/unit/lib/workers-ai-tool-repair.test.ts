import { describe, expect, it } from "vitest";
import { repairWorkersAIToolInput } from "../../../src/lib/workers-ai-tool-repair";

describe("repairWorkersAIToolInput", () => {
  it("returns valid JSON unchanged", () => {
    expect(repairWorkersAIToolInput('{"city":"Paris"}')).toBe(
      '{"city":"Paris"}'
    );
  });

  it("repairs duplicated Workers AI tool argument chunks", () => {
    const malformed = '{"city": "{"city": "Paris"}Paris"}';
    expect(repairWorkersAIToolInput(malformed)).toBe('{"city":"Paris"}');
  });
});
