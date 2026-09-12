import { tool } from "ai";
import { z } from "zod";
import type { AppServices } from "../../lib/services";
import { toToolError } from "../../domain/investigation";
import { SERVICE_NAMES } from "../../db/seed/constants";

const serviceNameSchema = z.enum([
  SERVICE_NAMES.checkout,
  SERVICE_NAMES.payments,
  SERVICE_NAMES.auth,
  SERVICE_NAMES.catalog,
  SERVICE_NAMES.notification
]);

export function createInfrastructureTools(services: AppServices) {
  return {
    getServiceHealth: tool({
      description:
        "Get current health summary for a service including status, deployment, and latest metrics.",
      inputSchema: z.object({
        serviceName: serviceNameSchema.describe("Service name to inspect")
      }),
      execute: async ({ serviceName }) => {
        try {
          return await services.infrastructure.getServiceHealth(serviceName);
        } catch (error) {
          return toToolError(error);
        }
      }
    }),

    getRecentMetrics: tool({
      description: "Fetch recent metric samples for a service.",
      inputSchema: z.object({
        serviceName: serviceNameSchema,
        limit: z.number().int().min(1).max(20).default(5)
      }),
      execute: async ({ serviceName, limit }) => {
        try {
          return await services.infrastructure.getRecentMetrics(
            serviceName,
            limit
          );
        } catch (error) {
          return toToolError(error);
        }
      }
    }),

    getRecentLogs: tool({
      description: "Fetch recent log entries for a service.",
      inputSchema: z.object({
        serviceName: serviceNameSchema,
        limit: z.number().int().min(1).max(50).default(10),
        level: z.enum(["debug", "info", "warn", "error"]).optional()
      }),
      execute: async ({ serviceName, limit, level }) => {
        try {
          return await services.infrastructure.getRecentLogs(
            serviceName,
            limit,
            level
          );
        } catch (error) {
          return toToolError(error);
        }
      }
    }),

    getRecentDeployments: tool({
      description: "List recent deployments for a service.",
      inputSchema: z.object({
        serviceName: serviceNameSchema,
        limit: z.number().int().min(1).max(10).default(3)
      }),
      execute: async ({ serviceName, limit }) => {
        try {
          return await services.infrastructure.getRecentDeployments(
            serviceName,
            limit
          );
        } catch (error) {
          return toToolError(error);
        }
      }
    }),

    getServiceDependencies: tool({
      description: "List upstream/downstream dependencies for a service.",
      inputSchema: z.object({
        serviceName: serviceNameSchema
      }),
      execute: async ({ serviceName }) => {
        try {
          return await services.infrastructure.getServiceDependencies(
            serviceName
          );
        } catch (error) {
          return toToolError(error);
        }
      }
    })
  };
}

export function createContextTools(services: AppServices) {
  return {
    getContextByKey: tool({
      description:
        "Load a conversation context by its public key (e.g. NWE-016).",
      inputSchema: z.object({
        contextKey: z.string().describe("Context key such as NWE-016")
      }),
      execute: async ({ contextKey }) => {
        try {
          const context = await services.context.getContextByKey(contextKey);
          return {
            contextKey: context.contextKey,
            status: context.status,
            summary: context.summary,
            createdAt: context.createdAt,
            updatedAt: context.updatedAt,
            sourceChannel: context.sourceChannel
          };
        } catch (error) {
          return toToolError(error);
        }
      }
    }),

    getContextSummary: tool({
      description: "Get the rolling summary for a context.",
      inputSchema: z.object({
        contextKey: z.string()
      }),
      execute: async ({ contextKey }) => {
        try {
          const context = await services.context.getContextByKey(contextKey);
          return {
            contextKey: context.contextKey,
            summary: context.summary,
            status: context.status
          };
        } catch (error) {
          return toToolError(error);
        }
      }
    }),

    getRelevantContextMessages: tool({
      description: "Fetch recent messages stored for a context.",
      inputSchema: z.object({
        contextKey: z.string(),
        limit: z.number().int().min(1).max(50).default(10)
      }),
      execute: async ({ contextKey, limit }) => {
        try {
          const context = await services.context.getContextByKey(contextKey);
          const messages = await services.context.getRelevantMessages(
            context.id,
            limit
          );
          return {
            contextKey: context.contextKey,
            messages: messages.map((message) => ({
              role: message.role,
              content: message.content,
              channel: message.channel,
              createdAt: message.createdAt
            }))
          };
        } catch (error) {
          return toToolError(error);
        }
      }
    })
  };
}

export function createIncidentTools(services: AppServices) {
  return {
    getIncidentById: tool({
      description:
        "Look up an incident by public key (INC-42) or internal UUID.",
      inputSchema: z.object({
        incidentRef: z.string().describe("Incident key (INC-42) or UUID")
      }),
      execute: async ({ incidentRef }) => {
        try {
          const incident = incidentRef.startsWith("INC-")
            ? await services.incidents.getIncidentByKey(incidentRef)
            : await services.incidents.getIncidentById(incidentRef);
          return incident;
        } catch (error) {
          return toToolError(error);
        }
      }
    }),

    getIncidentHistory: tool({
      description: "List historical incidents for a service.",
      inputSchema: z.object({
        serviceName: serviceNameSchema,
        limit: z.number().int().min(1).max(20).default(5)
      }),
      execute: async ({ serviceName, limit }) => {
        try {
          return await services.incidents.getIncidentHistory(
            serviceName,
            limit
          );
        } catch (error) {
          return toToolError(error);
        }
      }
    }),

    getIncidentTimeline: tool({
      description: "Fetch the audit timeline for an incident.",
      inputSchema: z.object({
        incidentRef: z.string()
      }),
      execute: async ({ incidentRef }) => {
        try {
          const incident = incidentRef.startsWith("INC-")
            ? await services.incidents.getIncidentByKey(incidentRef)
            : await services.incidents.getIncidentById(incidentRef);
          return await services.incidents.getIncidentTimeline(incident.id);
        } catch (error) {
          return toToolError(error);
        }
      }
    }),

    searchActiveIncidents: tool({
      description: "Search active incidents, optionally filtered by service.",
      inputSchema: z.object({
        serviceName: serviceNameSchema.optional()
      }),
      execute: async ({ serviceName }) => {
        try {
          const incidents =
            await services.incidents.searchActiveIncidents(serviceName);
          return { count: incidents.length, incidents };
        } catch (error) {
          return toToolError(error);
        }
      }
    }),

    createIncident: tool({
      description:
        "Create a new incident record for investigation tracking. Does not mutate infrastructure.",
      inputSchema: z.object({
        title: z.string().min(3).max(200),
        description: z.string().min(3).max(2000),
        serviceName: serviceNameSchema,
        severity: z.enum(["SEV1", "SEV2", "SEV3", "SEV4"])
      }),
      execute: async ({ title, description, serviceName, severity }) => {
        try {
          return await services.incidents.createIncident({
            title,
            description,
            serviceName,
            severity
          });
        } catch (error) {
          return toToolError(error);
        }
      }
    })
  };
}

export function createInvestigationTools(services: AppServices) {
  return {
    investigateService: tool({
      description:
        "Run multi-source investigation for a service. Correlates metrics, logs, deployments, dependencies, and incident history, then ranks likely causes.",
      inputSchema: z.object({
        serviceName: serviceNameSchema
      }),
      execute: async ({ serviceName }) => {
        try {
          return await services.investigation.investigateService(serviceName);
        } catch (error) {
          return toToolError(error);
        }
      }
    })
  };
}

export function createOperationalTools(services: AppServices) {
  return {
    ...createInfrastructureTools(services),
    ...createContextTools(services),
    ...createIncidentTools(services),
    ...createInvestigationTools(services)
  };
}
