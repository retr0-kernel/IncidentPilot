import { SERVICE_NAMES, SCENARIO_SUMMARY } from "../db/seed/constants";
import { InfrastructureRepository } from "../db/queries/infrastructure";
import { IncidentRepository } from "../db/queries/incidents";
import { isAppError } from "../lib/errors";

export interface InvestigationHypothesis {
  cause: string;
  confidence: number;
  evidence: string[];
}

export interface InvestigationResult {
  service: string;
  scenarioSummary: string;
  status: string;
  currentDeployment: string | null;
  evidence: {
    metrics: ReturnType<
      InfrastructureRepository["getRecentMetrics"]
    > extends Promise<infer T>
      ? T
      : never;
    logs: Awaited<ReturnType<InfrastructureRepository["getRecentLogs"]>>;
    deployments: Awaited<
      ReturnType<InfrastructureRepository["getRecentDeployments"]>
    >;
    dependencies: Awaited<
      ReturnType<InfrastructureRepository["getServiceDependencies"]>
    >;
    incidentHistory: Awaited<
      ReturnType<IncidentRepository["getIncidentHistory"]>
    >;
  };
  hypotheses: InvestigationHypothesis[];
  recommendedAction: string;
  likelyCause: string;
  confidence: number;
}

function rankHypotheses(
  serviceName: string,
  evidence: InvestigationResult["evidence"]
): InvestigationHypothesis[] {
  const metrics = evidence.metrics.samples;
  const latest = metrics[0];
  const logs = evidence.logs.entries;
  const deployment = evidence.deployments.deployments[0];
  const history = evidence.incidentHistory.incidents;

  switch (serviceName) {
    case SERVICE_NAMES.checkout: {
      return [
        {
          cause: `Deployment regression (${deployment?.version ?? "recent deploy"})`,
          confidence: 0.91,
          evidence: [
            `${deployment?.version ?? "Current deployment"} is active`,
            `Error rate increased to ${latest?.errorRate ?? "unknown"}%`,
            `p95 latency reached ${latest?.p95LatencyMs ?? "unknown"}ms`,
            logs[0]?.message ?? "Checkout error logs present",
            history[0]
              ? `Similar prior incident ${history[0].incidentKey}`
              : "Historical deployment regression pattern"
          ]
        },
        {
          cause: "Downstream dependency failure",
          confidence: 0.24,
          evidence: evidence.dependencies.dependencies.map(
            (dep) => `Depends on ${dep.serviceName}`
          )
        }
      ];
    }
    case SERVICE_NAMES.payments:
      return [
        {
          cause: "Database/dependency degradation (payments-db)",
          confidence: 0.89,
          evidence: [
            `Deployment unchanged at ${deployment?.version ?? "v18"}`,
            logs.find((entry) => entry.errorCode?.includes("PAY-DB"))
              ?.message ?? "payments-db errors in logs",
            `Error rate ${latest?.errorRate ?? "unknown"}% with stable deploy`
          ]
        },
        {
          cause: "Application regression in payments-service",
          confidence: 0.18,
          evidence: [`Current deployment ${deployment?.version ?? "unknown"}`]
        }
      ];
    case SERVICE_NAMES.auth:
      return [
        {
          cause: "Traffic spike / rate limiting",
          confidence: 0.86,
          evidence: [
            `Request rate elevated to ${latest?.requestRate ?? "unknown"}`,
            logs.filter((entry) => entry.errorCode === "AUTH-429").length
              ? "AUTH-429 rate limit logs observed"
              : "Rate limit warnings in logs",
            `Error rate ${latest?.errorRate ?? "unknown"}%`
          ]
        },
        {
          cause: "Auth service regression",
          confidence: 0.21,
          evidence: [`Deployment ${deployment?.version ?? "unknown"}`]
        }
      ];
    case SERVICE_NAMES.catalog:
      return [
        {
          cause: "Redis/cache cluster degradation (not deployment regression)",
          confidence: 0.84,
          evidence: [
            logs.find((entry) => entry.errorCode?.includes("CAT-CACHE"))
              ?.message ?? "Cache timeout logs present",
            `Recent deploy ${deployment?.version ?? "v15"} correlates weakly with cache errors`,
            `Error rate ${latest?.errorRate ?? "unknown"}%`
          ]
        },
        {
          cause: `Deployment regression (${deployment?.version ?? "recent deploy"})`,
          confidence: 0.31,
          evidence: [
            `Deployment ${deployment?.version ?? "unknown"} recently shipped`
          ]
        }
      ];
    case SERVICE_NAMES.notification:
      return [
        {
          cause: "External SMTP credential/config issue (rollback ineffective)",
          confidence: 0.88,
          evidence: [
            logs.find((entry) => entry.errorCode === "NTF-SMTP-401")?.message ??
              "SMTP auth failures in logs",
            history.find((incident) => incident.incidentKey === "INC-29")
              ? "Prior remediation INC-29 remained NOT_RESOLVED"
              : "Remediation failure pattern in history",
            `Error rate still ${latest?.errorRate ?? "unknown"}% after rollback`
          ]
        },
        {
          cause: "Application deployment regression",
          confidence: 0.22,
          evidence: [`Current deployment ${deployment?.version ?? "unknown"}`]
        }
      ];
    default:
      return [
        {
          cause: "Unknown operational issue",
          confidence: 0.4,
          evidence: [`Service status requires manual review`]
        }
      ];
  }
}

function recommendedActionFor(
  serviceName: string,
  topHypothesis: InvestigationHypothesis
): string {
  switch (serviceName) {
    case SERVICE_NAMES.checkout:
      return "Rollback checkout-service v42 to v41 and verify error/latency recovery";
    case SERVICE_NAMES.payments:
      return "Investigate payments-db pool exhaustion and restore database capacity";
    case SERVICE_NAMES.auth:
      return "Scale auth capacity and tune rate limits for current traffic cohort";
    case SERVICE_NAMES.catalog:
      return "Restore Redis/cache cluster health before considering deployment rollback";
    case SERVICE_NAMES.notification:
      return "Rotate/repair external SMTP credentials; rollback alone will not restore health";
    default:
      return topHypothesis.cause;
  }
}

export class InvestigationService {
  constructor(
    private readonly infrastructure: InfrastructureRepository,
    private readonly incidents: IncidentRepository
  ) {}

  async investigateService(serviceName: string): Promise<InvestigationResult> {
    const health = await this.infrastructure.getServiceHealth(serviceName);
    const [metrics, logs, deployments, dependencies, incidentHistory] =
      await Promise.all([
        this.infrastructure.getRecentMetrics(serviceName, 5),
        this.infrastructure.getRecentLogs(serviceName, 10),
        this.infrastructure.getRecentDeployments(serviceName, 3),
        this.infrastructure.getServiceDependencies(serviceName),
        this.incidents.getIncidentHistory(serviceName, 5)
      ]);

    const evidence = {
      metrics,
      logs,
      deployments,
      dependencies,
      incidentHistory
    };
    const hypotheses = rankHypotheses(serviceName, evidence).sort(
      (a, b) => b.confidence - a.confidence
    );
    const top = hypotheses[0];

    return {
      service: serviceName,
      scenarioSummary:
        SCENARIO_SUMMARY[serviceName as keyof typeof SCENARIO_SUMMARY] ??
        "Operational investigation",
      status: health.status,
      currentDeployment: health.currentDeployment,
      evidence,
      hypotheses,
      likelyCause: top.cause,
      confidence: top.confidence,
      recommendedAction: recommendedActionFor(serviceName, top)
    };
  }
}

export function toToolError(error: unknown) {
  if (isAppError(error)) {
    return {
      error: true,
      code: error.code,
      message: error.message,
      details: error.details
    };
  }
  return {
    error: true,
    code: "INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "Unexpected error"
  };
}
