-- Deterministic demo seed for IncidentPilot (TASK 3)
-- Anchor time: 2026-09-10T12:00:00.000Z
PRAGMA foreign_keys = ON;

-- Services
INSERT OR IGNORE INTO services (
  id, name, owner, environment, status, criticality,
  current_deployment_id, created_at, updated_at
) VALUES
  ('00000000-0000-4000-8000-000000000001', 'checkout-service', 'commerce-team', 'production', 'degraded', 'critical', '00000000-0000-4000-8001-000000000042', '2026-01-01T00:00:00.000Z', '2026-09-10T11:15:00.000Z'),
  ('00000000-0000-4000-8000-000000000002', 'payments-service', 'payments-team', 'production', 'degraded', 'critical', '00000000-0000-4000-8002-000000000018', '2026-01-01T00:00:00.000Z', '2026-09-03T09:00:00.000Z'),
  ('00000000-0000-4000-8000-000000000003', 'auth-service', 'identity-team', 'production', 'degraded', 'high', '00000000-0000-4000-8003-000000000012', '2026-01-01T00:00:00.000Z', '2026-09-01T08:00:00.000Z'),
  ('00000000-0000-4000-8000-000000000004', 'catalog-service', 'catalog-team', 'production', 'degraded', 'high', '00000000-0000-4000-8004-000000000015', '2026-01-01T00:00:00.000Z', '2026-09-10T10:00:00.000Z'),
  ('00000000-0000-4000-8000-000000000005', 'notification-service', 'comms-team', 'production', 'degraded', 'medium', '00000000-0000-4000-8005-000000000008', '2026-01-01T00:00:00.000Z', '2026-09-10T09:30:00.000Z');

-- Dependencies
INSERT OR IGNORE INTO service_dependencies (service_id, depends_on_service_id, dependency_type) VALUES
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'sync'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', 'sync'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'database'),
  ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000003', 'async');

-- Deployments
INSERT OR IGNORE INTO deployments (
  id, service_id, version, deployed_at, deployed_by, status, previous_deployment_id
) VALUES
  ('00000000-0000-4000-8001-000000000041', '00000000-0000-4000-8000-000000000001', 'v41', '2026-09-08T10:00:00.000Z', 'deploy-bot', 'superseded', NULL),
  ('00000000-0000-4000-8001-000000000042', '00000000-0000-4000-8000-000000000001', 'v42', '2026-09-10T11:15:00.000Z', 'deploy-bot', 'active', '00000000-0000-4000-8001-000000000041'),
  ('00000000-0000-4000-8002-000000000018', '00000000-0000-4000-8000-000000000002', 'v18', '2026-09-03T09:00:00.000Z', 'deploy-bot', 'active', NULL),
  ('00000000-0000-4000-8003-000000000012', '00000000-0000-4000-8000-000000000003', 'v12', '2026-09-01T08:00:00.000Z', 'deploy-bot', 'active', NULL),
  ('00000000-0000-4000-8004-000000000014', '00000000-0000-4000-8000-000000000004', 'v14', '2026-09-05T14:00:00.000Z', 'deploy-bot', 'superseded', NULL),
  ('00000000-0000-4000-8004-000000000015', '00000000-0000-4000-8000-000000000004', 'v15', '2026-09-10T10:00:00.000Z', 'deploy-bot', 'active', '00000000-0000-4000-8004-000000000014'),
  ('00000000-0000-4000-8005-000000000007', '00000000-0000-4000-8000-000000000005', 'v7', '2026-09-08T16:00:00.000Z', 'deploy-bot', 'superseded', NULL),
  ('00000000-0000-4000-8005-000000000008', '00000000-0000-4000-8000-000000000005', 'v8', '2026-09-10T09:30:00.000Z', 'deploy-bot', 'active', '00000000-0000-4000-8005-000000000007');

-- Scenario 1: checkout metrics (healthy -> regression after v42)
INSERT OR IGNORE INTO metrics (
  id, service_id, timestamp, request_rate, error_rate, p95_latency_ms, cpu_percent, memory_percent
) VALUES
  ('00000000-0000-4000-8020-000000000001', '00000000-0000-4000-8000-000000000001', '2026-09-10T11:00:00.000Z', 820.0, 0.4, 310.0, 42.0, 55.0),
  ('00000000-0000-4000-8020-000000000002', '00000000-0000-4000-8000-000000000001', '2026-09-10T11:20:00.000Z', 805.0, 2.1, 540.0, 48.0, 57.0),
  ('00000000-0000-4000-8020-000000000003', '00000000-0000-4000-8000-000000000001', '2026-09-10T11:50:00.000Z', 790.0, 18.4, 2810.0, 51.0, 59.0);

-- Scenario 2: payments dependency degradation (stable version)
INSERT OR IGNORE INTO metrics (
  id, service_id, timestamp, request_rate, error_rate, p95_latency_ms, cpu_percent, memory_percent
) VALUES
  ('00000000-0000-4000-8020-000000000010', '00000000-0000-4000-8000-000000000002', '2026-09-10T11:00:00.000Z', 420.0, 0.6, 180.0, 35.0, 48.0),
  ('00000000-0000-4000-8020-000000000011', '00000000-0000-4000-8000-000000000002', '2026-09-10T11:50:00.000Z', 415.0, 9.8, 4200.0, 36.0, 49.0);

-- Scenario 3: auth traffic spike / rate limits
INSERT OR IGNORE INTO metrics (
  id, service_id, timestamp, request_rate, error_rate, p95_latency_ms, cpu_percent, memory_percent
) VALUES
  ('00000000-0000-4000-8020-000000000020', '00000000-0000-4000-8000-000000000003', '2026-09-10T10:30:00.000Z', 1200.0, 0.5, 95.0, 44.0, 52.0),
  ('00000000-0000-4000-8020-000000000021', '00000000-0000-4000-8000-000000000003', '2026-09-10T11:40:00.000Z', 4100.0, 12.6, 210.0, 78.0, 71.0);

-- Scenario 4: catalog false correlation (deploy v15 but cache/redis issue)
INSERT OR IGNORE INTO metrics (
  id, service_id, timestamp, request_rate, error_rate, p95_latency_ms, cpu_percent, memory_percent
) VALUES
  ('00000000-0000-4000-8020-000000000030', '00000000-0000-4000-8000-000000000004', '2026-09-10T11:00:00.000Z', 650.0, 1.2, 140.0, 38.0, 46.0),
  ('00000000-0000-4000-8020-000000000031', '00000000-0000-4000-8000-000000000004', '2026-09-10T11:50:00.000Z', 645.0, 7.4, 980.0, 39.0, 47.0);

-- Scenario 5: notification rollback failure
INSERT OR IGNORE INTO metrics (
  id, service_id, timestamp, request_rate, error_rate, p95_latency_ms, cpu_percent, memory_percent
) VALUES
  ('00000000-0000-4000-8020-000000000040', '00000000-0000-4000-8000-000000000005', '2026-09-10T10:00:00.000Z', 300.0, 0.8, 120.0, 33.0, 41.0),
  ('00000000-0000-4000-8020-000000000041', '00000000-0000-4000-8000-000000000005', '2026-09-10T11:00:00.000Z', 295.0, 14.2, 860.0, 34.0, 42.0),
  ('00000000-0000-4000-8020-000000000042', '00000000-0000-4000-8000-000000000005', '2026-09-10T11:45:00.000Z', 292.0, 13.8, 840.0, 34.0, 42.0);

-- Logs
INSERT OR IGNORE INTO logs (
  id, service_id, timestamp, level, message, error_code, deployment_version
) VALUES
  ('00000000-0000-4000-8030-000000000001', '00000000-0000-4000-8000-000000000001', '2026-09-10T11:22:00.000Z', 'error', 'NullPointerException in CartValidator after deploy v42', 'CHK-5001', 'v42'),
  ('00000000-0000-4000-8030-000000000002', '00000000-0000-4000-8000-000000000001', '2026-09-10T11:35:00.000Z', 'error', 'Checkout commit failed: downstream 5xx from pricing module', 'CHK-5002', 'v42'),
  ('00000000-0000-4000-8030-000000000010', '00000000-0000-4000-8000-000000000002', '2026-09-10T11:30:00.000Z', 'error', 'payments-db connection pool exhausted', 'PAY-DB-408', 'v18'),
  ('00000000-0000-4000-8030-000000000011', '00000000-0000-4000-8000-000000000002', '2026-09-10T11:42:00.000Z', 'warn', 'Dependency timeout calling payments-db after 5000ms', 'PAY-DB-504', 'v18'),
  ('00000000-0000-4000-8030-000000000020', '00000000-0000-4000-8000-000000000003', '2026-09-10T11:35:00.000Z', 'warn', 'Rate limit exceeded for client cohort mobile-launch', 'AUTH-429', 'v12'),
  ('00000000-0000-4000-8030-000000000021', '00000000-0000-4000-8000-000000000003', '2026-09-10T11:48:00.000Z', 'warn', 'Token bucket saturated at edge gateway', 'AUTH-429', 'v12'),
  ('00000000-0000-4000-8030-000000000030', '00000000-0000-4000-8000-000000000004', '2026-09-10T11:40:00.000Z', 'error', 'Redis cache cluster timeout fetching product facets', 'CAT-CACHE-504', 'v15'),
  ('00000000-0000-4000-8030-000000000031', '00000000-0000-4000-8000-000000000004', '2026-09-10T11:45:00.000Z', 'error', 'Catalog read path healthy but upstream cache latency elevated', 'CAT-CACHE-408', 'v15'),
  ('00000000-0000-4000-8030-000000000040', '00000000-0000-4000-8000-000000000005', '2026-09-10T11:10:00.000Z', 'error', 'SMTP relay auth failure after v8 config change', 'NTF-SMTP-401', 'v8'),
  ('00000000-0000-4000-8030-000000000041', '00000000-0000-4000-8000-000000000005', '2026-09-10T11:50:00.000Z', 'error', 'Rollback to v7 completed but relay still rejecting credentials', 'NTF-SMTP-401', 'v7');

-- Historical resolved incident for checkout (similar regression)
INSERT OR IGNORE INTO incidents (
  id, incident_key, title, description, service_id, severity, status,
  detected_at, resolved_at, root_cause, confidence, recommended_action,
  resolution_summary, verification_result
) VALUES
  (
    '00000000-0000-4000-8010-000000000017',
    'INC-17',
    'Checkout deployment regression (historical)',
    'Prior checkout outage caused by bad deployment rollout.',
    '00000000-0000-4000-8000-000000000001',
    'SEV2',
    'RESOLVED',
    '2026-08-15T09:10:00.000Z',
    '2026-08-15T10:05:00.000Z',
    'Deployment v39 introduced regression; rollback to v38 restored health.',
    0.94,
    'Rollback deployment v39 to v38',
    'Service recovered after rollback and verification.',
    'RESOLVED'
  ),
  (
    '00000000-0000-4000-8010-000000000029',
    'INC-29',
    'Notification rollback did not restore health',
    'Simulated remediation failure scenario seed incident.',
    '00000000-0000-4000-8000-000000000005',
    'SEV3',
    'FAILED',
    '2026-09-10T10:30:00.000Z',
    NULL,
    'External SMTP provider credential mismatch unrelated to app version.',
    0.88,
    'Rollback v8 to v7',
    'Rollback completed but verification remained NOT_RESOLVED.',
    'NOT_RESOLVED'
  );

INSERT OR IGNORE INTO incident_events (
  id, incident_id, timestamp, event_type, actor_type, actor_id, source_channel, metadata
) VALUES
  ('00000000-0000-4000-8040-000000000001', '00000000-0000-4000-8010-000000000017', '2026-08-15T09:10:00.000Z', 'INCIDENT_CREATED', 'system', 'seed', 'system', '{"source":"seed"}'),
  ('00000000-0000-4000-8040-000000000002', '00000000-0000-4000-8010-000000000017', '2026-08-15T09:55:00.000Z', 'REMEDIATION_COMPLETED', 'workflow', 'wf-seed-17', 'workflow', '{"action":"rollback","from":"v39","to":"v38"}'),
  ('00000000-0000-4000-8040-000000000003', '00000000-0000-4000-8010-000000000017', '2026-08-15T10:05:00.000Z', 'INCIDENT_RESOLVED', 'system', 'seed', 'system', '{"verification":"RESOLVED"}'),
  ('00000000-0000-4000-8040-000000000010', '00000000-0000-4000-8010-000000000029', '2026-09-10T11:40:00.000Z', 'REMEDIATION_COMPLETED', 'workflow', 'wf-seed-29', 'workflow', '{"action":"rollback","from":"v8","to":"v7"}'),
  ('00000000-0000-4000-8040-000000000011', '00000000-0000-4000-8010-000000000029', '2026-09-10T11:50:00.000Z', 'INCIDENT_FAILED', 'system', 'seed', 'system', '{"verification":"NOT_RESOLVED"}');

INSERT OR IGNORE INTO remediation_actions (
  id, incident_id, action, requested_by, approved_by, status, started_at, completed_at, result
) VALUES
  (
    '00000000-0000-4000-8050-000000000029',
    '00000000-0000-4000-8010-000000000029',
    'Rollback notification-service v8 to v7',
    'agent',
    'operator-1',
    'completed',
    '2026-09-10T11:35:00.000Z',
    '2026-09-10T11:40:00.000Z',
    '{"simulated":true,"healthRecovered":false}'
  );
