-- IncidentPilot initial schema (TASK 3)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS context_sequence (
  prefix TEXT PRIMARY KEY,
  next_value INTEGER NOT NULL,
  width INTEGER NOT NULL DEFAULT 3,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS incident_sequence (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  next_value INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS conversation_contexts (
  id TEXT PRIMARY KEY,
  context_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  source_reference TEXT,
  workspace_id TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  summary TEXT,
  agent_instance_id TEXT
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id TEXT PRIMARY KEY,
  context_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  channel TEXT NOT NULL,
  external_message_id TEXT,
  created_at TEXT NOT NULL,
  metadata TEXT,
  FOREIGN KEY (context_id) REFERENCES conversation_contexts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS context_events (
  id TEXT PRIMARY KEY,
  context_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source_channel TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (context_id) REFERENCES conversation_contexts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS context_memory_facts (
  id TEXT PRIMARY KEY,
  context_id TEXT NOT NULL,
  fact TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (context_id) REFERENCES conversation_contexts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS context_linked_entities (
  id TEXT PRIMARY KEY,
  context_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (context_id, entity_type, entity_id),
  FOREIGN KEY (context_id) REFERENCES conversation_contexts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  owner TEXT NOT NULL,
  environment TEXT NOT NULL,
  status TEXT NOT NULL,
  criticality TEXT NOT NULL,
  current_deployment_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS service_dependencies (
  service_id TEXT NOT NULL,
  depends_on_service_id TEXT NOT NULL,
  dependency_type TEXT NOT NULL,
  PRIMARY KEY (service_id, depends_on_service_id),
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (depends_on_service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  version TEXT NOT NULL,
  deployed_at TEXT NOT NULL,
  deployed_by TEXT NOT NULL,
  status TEXT NOT NULL,
  previous_deployment_id TEXT,
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS metrics (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  request_rate REAL NOT NULL,
  error_rate REAL NOT NULL,
  p95_latency_ms REAL NOT NULL,
  cpu_percent REAL NOT NULL,
  memory_percent REAL NOT NULL,
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  error_code TEXT,
  deployment_version TEXT,
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  incident_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  service_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  resolved_at TEXT,
  root_cause TEXT,
  confidence REAL,
  recommended_action TEXT,
  resolution_summary TEXT,
  verification_result TEXT,
  workflow_id TEXT,
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS remediation_actions (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  action TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  status TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  result TEXT,
  FOREIGN KEY (incident_id) REFERENCES incidents(id)
);

CREATE TABLE IF NOT EXISTS incident_events (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  source_channel TEXT,
  metadata TEXT,
  FOREIGN KEY (incident_id) REFERENCES incidents(id)
);

CREATE TABLE IF NOT EXISTS workflow_instances (
  id TEXT PRIMARY KEY,
  workflow_key TEXT NOT NULL UNIQUE,
  incident_id TEXT NOT NULL,
  context_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  metadata TEXT,
  FOREIGN KEY (incident_id) REFERENCES incidents(id),
  FOREIGN KEY (context_id) REFERENCES conversation_contexts(id)
);

CREATE TABLE IF NOT EXISTS slack_event_idempotency (
  event_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversation_contexts_status
  ON conversation_contexts (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_context_created
  ON conversation_messages (context_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_context_events_context_created
  ON context_events (context_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_service_timestamp
  ON metrics (service_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_logs_service_timestamp
  ON logs (service_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_service_status
  ON incidents (service_id, status, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_incident_events_incident_timestamp
  ON incident_events (incident_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_deployments_service_deployed
  ON deployments (service_id, deployed_at DESC);

INSERT OR IGNORE INTO context_sequence (prefix, next_value, width, updated_at)
VALUES ('NWE', 1, 3, datetime('now'));

INSERT OR IGNORE INTO incident_sequence (id, next_value)
VALUES (1, 43);
