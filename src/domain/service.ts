export type ServiceStatus = "healthy" | "degraded" | "down";

export type ServiceCriticality = "low" | "medium" | "high" | "critical";

export interface Service {
  id: string;
  name: string;
  owner: string;
  environment: string;
  status: ServiceStatus;
  criticality: ServiceCriticality;
  currentDeploymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceDependency {
  serviceId: string;
  dependsOnServiceId: string;
  dependencyType: "sync" | "async" | "database";
}

export interface MetricSample {
  id: string;
  serviceId: string;
  timestamp: string;
  requestRate: number;
  errorRate: number;
  p95LatencyMs: number;
  cpuPercent: number;
  memoryPercent: number;
}

export interface LogEntry {
  id: string;
  serviceId: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  errorCode: string | null;
  deploymentVersion: string | null;
}
