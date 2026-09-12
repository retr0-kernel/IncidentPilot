import { splitSqlStatements } from "../../../src/db/lib/sql";
import { describe, expect, it } from "vitest";

describe("splitSqlStatements", () => {
  it("does not split on semicolons inside string literals", () => {
    const statements = splitSqlStatements(
      "INSERT INTO logs (message) VALUES ('healthy; still broken'); SELECT 1;"
    );

    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain("healthy; still broken");
  });
});
