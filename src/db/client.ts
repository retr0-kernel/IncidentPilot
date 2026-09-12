import { ConfigurationError } from "../lib/errors";

export type Database = D1Database;

export interface IncidentPilotBindings extends Env {
  DB?: D1Database;
}

export function getDatabase(env: IncidentPilotBindings): Database {
  if (!env.DB) {
    throw new ConfigurationError(
      'D1 binding "DB" is not configured. Add it in wrangler.jsonc during TASK 3.'
    );
  }
  return env.DB;
}

export function hasDatabase(
  env: IncidentPilotBindings
): env is IncidentPilotBindings & {
  DB: D1Database;
} {
  return Boolean(env.DB);
}

export type QueryResult<T> = {
  results: T[];
  success: boolean;
  meta?: D1Meta;
};

export type QueryRunner = {
  all<T>(sql: string, ...params: unknown[]): Promise<QueryResult<T>>;
  first<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  run(sql: string, ...params: unknown[]): Promise<D1Result>;
};

export function createQueryRunner(db: Database): QueryRunner {
  return {
    async all<T>(sql: string, ...params: unknown[]) {
      return db
        .prepare(sql)
        .bind(...params)
        .all<T>();
    },
    async first<T>(sql: string, ...params: unknown[]) {
      return db
        .prepare(sql)
        .bind(...params)
        .first<T>();
    },
    run(sql: string, ...params: unknown[]) {
      return db
        .prepare(sql)
        .bind(...params)
        .run();
    }
  };
}
