import {
  createQueryRunner,
  getDatabase,
  type IncidentPilotBindings
} from "../db/client";
import { ContextRepository } from "../db/queries/context";
import { InfrastructureRepository } from "../db/queries/infrastructure";
import { IncidentRepository } from "../db/queries/incidents";
import { RemediationRepository } from "../db/queries/remediation";
import {
  ContextService,
  createContextService
} from "../domain/context-service";
import { IncidentService } from "../domain/incident-service";
import { InvestigationService } from "../domain/investigation";
import { createMemoryService, MemoryService } from "../domain/memory-service";
import {
  createRemediationService,
  RemediationService
} from "../domain/remediation-service";
import { loadServerConfigFromEnv } from "../lib/config";

export interface AppServices {
  config: ReturnType<typeof loadServerConfigFromEnv>;
  context: ContextService;
  infrastructure: InfrastructureRepository;
  incidents: IncidentService;
  investigation: InvestigationService;
  remediation: RemediationService;
  memory: MemoryService;
}

export function createAppServices(env: IncidentPilotBindings): AppServices {
  const db = createQueryRunner(getDatabase(env));
  const config = loadServerConfigFromEnv(env);
  const contextRepo = new ContextRepository(db);
  const infrastructureRepo = new InfrastructureRepository(db);
  const incidentRepo = new IncidentRepository(db);
  const remediationRepo = new RemediationRepository(db);
  const context = createContextService(contextRepo, config);

  return {
    config,
    context,
    infrastructure: infrastructureRepo,
    incidents: new IncidentService(incidentRepo, infrastructureRepo),
    investigation: new InvestigationService(infrastructureRepo, incidentRepo),
    remediation: createRemediationService(
      remediationRepo,
      infrastructureRepo,
      incidentRepo
    ),
    memory: createMemoryService(context, db)
  };
}
