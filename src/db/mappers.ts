import type {
  ContextEvent,
  ContextStatus,
  ConversationContext,
  ConversationMessage,
  MessageChannel,
  MessageRole
} from "../domain/context";
import type {
  Incident,
  IncidentEvent,
  IncidentEventType,
  IncidentSeverity,
  IncidentStatus,
  VerificationResult,
  ActorType
} from "../domain/incident";
import type { ServiceStatus } from "../domain/service";

export interface ContextRow {
  id: string;
  context_key: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  source_channel: string;
  source_reference: string | null;
  workspace_id?: string | null;
  status: string;
  summary: string | null;
  agent_instance_id: string | null;
}

export interface MessageRow {
  id: string;
  context_id: string;
  role: string;
  content: string;
  channel: string;
  external_message_id: string | null;
  created_at: string;
  metadata: string | null;
}

export interface ContextEventRow {
  id: string;
  context_id: string;
  event_type: string;
  source_channel: string | null;
  metadata: string | null;
  created_at: string;
}

export interface ServiceRow {
  id: string;
  name: string;
  owner: string;
  environment: string;
  status: string;
  criticality: string;
  current_deployment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetricRow {
  id: string;
  service_id: string;
  timestamp: string;
  request_rate: number;
  error_rate: number;
  p95_latency_ms: number;
  cpu_percent: number;
  memory_percent: number;
}

export interface LogRow {
  id: string;
  service_id: string;
  timestamp: string;
  level: string;
  message: string;
  error_code: string | null;
  deployment_version: string | null;
}

export interface DeploymentRow {
  id: string;
  service_id: string;
  version: string;
  deployed_at: string;
  deployed_by: string;
  status: string;
  previous_deployment_id: string | null;
}

export interface IncidentRow {
  id: string;
  incident_key: string;
  title: string;
  description: string;
  service_id: string;
  severity: string;
  status: string;
  detected_at: string;
  resolved_at: string | null;
  root_cause: string | null;
  confidence: number | null;
  recommended_action: string | null;
  resolution_summary: string | null;
  verification_result: string | null;
  workflow_id?: string | null;
}

export interface IncidentEventRow {
  id: string;
  incident_id: string;
  timestamp: string;
  event_type: string;
  actor_type: string;
  actor_id: string;
  source_channel: string | null;
  metadata: string | null;
}

function parseJsonRecord(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function mapContextRow(row: ContextRow): ConversationContext {
  return {
    id: row.id,
    contextKey: row.context_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    sourceChannel: row.source_channel as MessageChannel,
    sourceReference: row.source_reference,
    status: row.status as ContextStatus,
    summary: row.summary,
    agentInstanceId: row.agent_instance_id
  };
}

export function mapMessageRow(row: MessageRow): ConversationMessage {
  return {
    id: row.id,
    contextId: row.context_id,
    role: row.role as MessageRole,
    content: row.content,
    channel: row.channel as MessageChannel,
    externalMessageId: row.external_message_id,
    createdAt: row.created_at,
    metadata: parseJsonRecord(row.metadata)
  };
}

export function mapContextEventRow(row: ContextEventRow): ContextEvent {
  return {
    id: row.id,
    contextId: row.context_id,
    eventType: row.event_type as ContextEvent["eventType"],
    sourceChannel: row.source_channel as MessageChannel | null,
    metadata: parseJsonRecord(row.metadata),
    createdAt: row.created_at
  };
}

export function mapServiceRow(row: ServiceRow) {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    environment: row.environment,
    status: row.status as ServiceStatus,
    criticality: row.criticality,
    currentDeploymentId: row.current_deployment_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapMetricRow(row: MetricRow) {
  return {
    id: row.id,
    serviceId: row.service_id,
    timestamp: row.timestamp,
    requestRate: row.request_rate,
    errorRate: row.error_rate,
    p95LatencyMs: row.p95_latency_ms,
    cpuPercent: row.cpu_percent,
    memoryPercent: row.memory_percent
  };
}

export function mapLogRow(row: LogRow) {
  return {
    id: row.id,
    serviceId: row.service_id,
    timestamp: row.timestamp,
    level: row.level,
    message: row.message,
    errorCode: row.error_code,
    deploymentVersion: row.deployment_version
  };
}

export function mapDeploymentRow(row: DeploymentRow) {
  return {
    id: row.id,
    serviceId: row.service_id,
    version: row.version,
    deployedAt: row.deployed_at,
    deployedBy: row.deployed_by,
    status: row.status,
    previousDeploymentId: row.previous_deployment_id
  };
}

export function mapIncidentRow(row: IncidentRow): Incident {
  return {
    id: row.id,
    incidentKey: row.incident_key,
    title: row.title,
    description: row.description,
    serviceId: row.service_id,
    severity: row.severity as IncidentSeverity,
    status: row.status as IncidentStatus,
    detectedAt: row.detected_at,
    resolvedAt: row.resolved_at,
    rootCause: row.root_cause,
    confidence: row.confidence,
    recommendedAction: row.recommended_action,
    resolutionSummary: row.resolution_summary,
    verificationResult: row.verification_result as VerificationResult | null
  };
}

export function mapIncidentEventRow(row: IncidentEventRow): IncidentEvent {
  return {
    id: row.id,
    incidentId: row.incident_id,
    timestamp: row.timestamp,
    eventType: row.event_type as IncidentEventType,
    actorType: row.actor_type as ActorType,
    actorId: row.actor_id,
    sourceChannel: row.source_channel as IncidentEvent["sourceChannel"],
    metadata: parseJsonRecord(row.metadata)
  };
}
