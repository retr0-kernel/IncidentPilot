import { ConfigurationError } from "../lib/errors";

export type Database = D1Database;

export type IncidentPilotBindings = Env;

export function getDatabase(env: IncidentPilotBindings): Database {
  if (!env.DB) {
    throw new ConfigurationError(
      'D1 binding "DB" is not configured. Check d1_databases in wrangler.jsonc.'
    );
  }
  return env.DB;
}

export function hasDatabase(
  env: Partial<IncidentPilotBindings>
): env is IncidentPilotBindings {
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
