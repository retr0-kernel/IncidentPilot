import {
  createQueryRunner,
  getDatabase,
  type IncidentPilotBindings
} from "../db/client";
import { ContextRepository } from "../db/queries/context";
import { InfrastructureRepository } from "../db/queries/infrastructure";
import { IncidentRepository } from "../db/queries/incidents";
import {
  ContextService,
  createContextService
} from "../domain/context-service";
import { IncidentService } from "../domain/incident-service";
import { InvestigationService } from "../domain/investigation";
import { loadServerConfigFromEnv } from "../lib/config";

export interface AppServices {
  config: ReturnType<typeof loadServerConfigFromEnv>;
  context: ContextService;
  infrastructure: InfrastructureRepository;
  incidents: IncidentService;
  investigation: InvestigationService;
}

export function createAppServices(env: IncidentPilotBindings): AppServices {
  const db = createQueryRunner(getDatabase(env));
  const config = loadServerConfigFromEnv(env);
  const contextRepo = new ContextRepository(db);
  const infrastructureRepo = new InfrastructureRepository(db);
  const incidentRepo = new IncidentRepository(db);

  return {
    config,
    context: createContextService(contextRepo, config),
    infrastructure: infrastructureRepo,
    incidents: new IncidentService(incidentRepo, infrastructureRepo),
    investigation: new InvestigationService(infrastructureRepo, incidentRepo)
  };
}
