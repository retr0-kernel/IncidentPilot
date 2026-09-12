import type { QueryRunner } from "../client";
import { ContextRepository } from "./context";
import { InfrastructureRepository } from "./infrastructure";
import { IncidentRepository } from "./incidents";

export { ContextRepository } from "./context";
export { InfrastructureRepository } from "./infrastructure";
export { IncidentRepository } from "./incidents";

export class DatabaseRepository {
  constructor(protected readonly db: QueryRunner) {}
}

export function createRepository(db: QueryRunner): DatabaseRepository {
  return new DatabaseRepository(db);
}

export function createContextRepository(db: QueryRunner): ContextRepository {
  return new ContextRepository(db);
}

export function createInfrastructureRepository(
  db: QueryRunner
): InfrastructureRepository {
  return new InfrastructureRepository(db);
}

export function createIncidentRepository(db: QueryRunner): IncidentRepository {
  return new IncidentRepository(db);
}
