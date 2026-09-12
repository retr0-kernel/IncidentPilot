import type { QueryRunner } from "../client";
import {
  mapDeploymentRow,
  mapLogRow,
  mapMetricRow,
  mapServiceRow,
  type DeploymentRow,
  type LogRow,
  type MetricRow,
  type ServiceRow
} from "../mappers";
import { TABLES } from "../schema/tables";
import { NotFoundError } from "../../lib/errors";

export class InfrastructureRepository {
  constructor(private readonly db: QueryRunner) {}

  async getServiceByName(name: string) {
    const row = await this.db.first<ServiceRow>(
      `SELECT * FROM ${TABLES.services} WHERE name = ?`,
      name
    );
    if (!row) {
      throw new NotFoundError(`Service not found: ${name}`, {
        serviceName: name
      });
    }
    return mapServiceRow(row);
  }

  async getServiceHealth(serviceName: string) {
    const service = await this.getServiceByName(serviceName);
    const latestMetric = await this.db.first<MetricRow>(
      `SELECT m.* FROM ${TABLES.metrics} m
       WHERE m.service_id = ?
       ORDER BY m.timestamp DESC
       LIMIT 1`,
      service.id
    );

    const deployment = service.currentDeploymentId
      ? await this.db.first<DeploymentRow>(
          `SELECT * FROM ${TABLES.deployments} WHERE id = ?`,
          service.currentDeploymentId
        )
      : null;

    return {
      service: service.name,
      status: service.status,
      criticality: service.criticality,
      environment: service.environment,
      currentDeployment: deployment
        ? mapDeploymentRow(deployment).version
        : null,
      latestMetrics: latestMetric ? mapMetricRow(latestMetric) : null
    };
  }

  async getRecentMetrics(serviceName: string, limit = 10) {
    const service = await this.getServiceByName(serviceName);
    const result = await this.db.all<MetricRow>(
      `SELECT * FROM ${TABLES.metrics}
       WHERE service_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      service.id,
      limit
    );
    return {
      service: service.name,
      samples: result.results.map(mapMetricRow)
    };
  }

  async getRecentLogs(serviceName: string, limit = 20, level?: string) {
    const service = await this.getServiceByName(serviceName);
    const result = level
      ? await this.db.all<LogRow>(
          `SELECT * FROM ${TABLES.logs}
           WHERE service_id = ? AND level = ?
           ORDER BY timestamp DESC
           LIMIT ?`,
          service.id,
          level,
          limit
        )
      : await this.db.all<LogRow>(
          `SELECT * FROM ${TABLES.logs}
           WHERE service_id = ?
           ORDER BY timestamp DESC
           LIMIT ?`,
          service.id,
          limit
        );

    return {
      service: service.name,
      entries: result.results.map(mapLogRow)
    };
  }

  async getRecentDeployments(serviceName: string, limit = 5) {
    const service = await this.getServiceByName(serviceName);
    const result = await this.db.all<DeploymentRow>(
      `SELECT * FROM ${TABLES.deployments}
       WHERE service_id = ?
       ORDER BY deployed_at DESC
       LIMIT ?`,
      service.id,
      limit
    );
    return {
      service: service.name,
      deployments: result.results.map(mapDeploymentRow)
    };
  }

  async getServiceDependencies(serviceName: string) {
    const service = await this.getServiceByName(serviceName);
    const result = await this.db.all<{
      depends_on_service_id: string;
      dependency_type: string;
      depends_on_name: string;
    }>(
      `SELECT sd.depends_on_service_id, sd.dependency_type, s.name AS depends_on_name
       FROM ${TABLES.serviceDependencies} sd
       JOIN ${TABLES.services} s ON s.id = sd.depends_on_service_id
       WHERE sd.service_id = ?`,
      service.id
    );

    return {
      service: service.name,
      dependencies: result.results.map((row) => ({
        serviceName: row.depends_on_name,
        dependencyType: row.dependency_type
      }))
    };
  }
}
