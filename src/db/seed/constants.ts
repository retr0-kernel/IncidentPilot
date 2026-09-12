/**
 * Deterministic demo environment constants.
 * All seed timestamps are relative to this anchor so scenarios stay reproducible.
 */
export const DEMO_ANCHOR_ISO = "2026-09-10T12:00:00.000Z";

export const SERVICE_IDS = {
  checkout: "00000000-0000-4000-8000-000000000001",
  payments: "00000000-0000-4000-8000-000000000002",
  auth: "00000000-0000-4000-8000-000000000003",
  catalog: "00000000-0000-4000-8000-000000000004",
  notification: "00000000-0000-4000-8000-000000000005"
} as const;

export const SERVICE_NAMES = {
  checkout: "checkout-service",
  payments: "payments-service",
  auth: "auth-service",
  catalog: "catalog-service",
  notification: "notification-service"
} as const;

export const DEPLOYMENT_IDS = {
  checkoutV41: "00000000-0000-4000-8001-000000000041",
  checkoutV42: "00000000-0000-4000-8001-000000000042",
  paymentsV18: "00000000-0000-4000-8002-000000000018",
  authV12: "00000000-0000-4000-8003-000000000012",
  catalogV15: "00000000-0000-4000-8004-000000000015",
  catalogV14: "00000000-0000-4000-8004-000000000014",
  notificationV8: "00000000-0000-4000-8005-000000000008",
  notificationV7: "00000000-0000-4000-8005-000000000007"
} as const;

export const INCIDENT_IDS = {
  checkoutHistorical: "00000000-0000-4000-8010-000000000017",
  notificationFailed: "00000000-0000-4000-8010-000000000029"
} as const;

export const SCENARIO_SERVICES = [
  SERVICE_NAMES.checkout,
  SERVICE_NAMES.payments,
  SERVICE_NAMES.auth,
  SERVICE_NAMES.catalog,
  SERVICE_NAMES.notification
] as const;

export type ScenarioServiceName = (typeof SCENARIO_SERVICES)[number];

export const SCENARIO_SUMMARY = {
  [SERVICE_NAMES.checkout]:
    "Deployment v42 regression — elevated 5xx and latency after deploy",
  [SERVICE_NAMES.payments]:
    "Dependency/database degradation — no recent app deployment",
  [SERVICE_NAMES.auth]: "Traffic spike — elevated 429s and capacity pressure",
  [SERVICE_NAMES.catalog]:
    "False correlation — recent deploy present but evidence points elsewhere",
  [SERVICE_NAMES.notification]:
    "Remediation failure — rollback executed but service remains unhealthy"
} as const satisfies Record<ScenarioServiceName, string>;
