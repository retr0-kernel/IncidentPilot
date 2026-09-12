import type { QueryRunner } from "../client";

/**
 * Placeholder repository layer. Concrete queries land in TASK 3–4.
 */
export class DatabaseRepository {
  constructor(protected readonly db: QueryRunner) {}
}

export function createRepository(db: QueryRunner): DatabaseRepository {
  return new DatabaseRepository(db);
}
