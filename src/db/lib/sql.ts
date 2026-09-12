function stripCommentLines(statement: string): string {
  return statement
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
}

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];

    if (char === "'") {
      const isEscaped = sql[i - 1] === "\\";
      if (!isEscaped) {
        inSingleQuote = !inSingleQuote;
      }
    }

    if (char === ";" && !inSingleQuote) {
      const cleaned = stripCommentLines(current);
      if (cleaned) {
        statements.push(cleaned);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const tail = stripCommentLines(current);
  if (tail) {
    statements.push(tail);
  }

  return statements;
}

/**
 * Execute a SQL script against D1, skipping comment-only lines.
 * Wrangler CLI preprocesses files; Worker D1 exec is stricter.
 */
export async function runSqlScript(db: D1Database, sql: string): Promise<void> {
  for (const statement of splitSqlStatements(sql)) {
    await db.prepare(statement).run();
  }
}
