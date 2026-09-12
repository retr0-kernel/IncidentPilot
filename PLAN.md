# IncidentPilot — Implementation Plan

> **Purpose:** Persistent project memory across sessions. Source of truth for task order, architecture decisions, and progress. The full spec lives in the assignment document; this file tracks _how_ we build it.

---

## Current Status

| Field                   | Value                                                                   |
| ----------------------- | ----------------------------------------------------------------------- |
| **Phase**               | TASK 2 complete — Project architecture                                  |
| **Last completed task** | TASK 2 — Establish project architecture                                 |
| **Repo state**          | Folder structure, domain types, lib, db skeleton, Cloudflare setup docs |
| **Next task**           | TASK 3 — D1 and domain schema                                           |
| **Commit policy**       | User commits per task/phase — agent does NOT batch commits              |

---

## What IncidentPilot Is

An AI-powered engineering/SRE assistant on Cloudflare that:

1. Investigates operational problems using **tools** (not prose-only answers)
2. Gathers evidence from a **simulated** infrastructure environment
3. Forms ranked hypotheses and recommends remediation
4. Requires **human approval** before mutations
5. Executes remediation via **durable Workflows**
6. **Verifies** outcomes (never equates tool success with incident resolution)
7. **Remembers** context across sessions and channels
8. Is reachable via **Web** and **Slack** through the **same Agent**

---

## Core Architectural Principles (Non-Negotiable)

1. **LLM is not source of truth** — D1 + application code is
2. **LLM proposes; code authorizes and executes**
3. **Action execution ≠ successful outcome** — verification decides
4. **Context ID (NWE-016) ≠ Incident ID (INC-42) ≠ Workflow ID (WF-93)**
5. **Web and Slack are transport adapters** — same Agent, tools, memory, workflow
6. **Durable Workflows own long-running remediation**
7. **Agent state (runtime) vs D1 (persistent domain data)** — distinct roles
8. **Deterministic simulated environment** — no real prod connections
9. **Failures must be visible and truthful**
10. **No technology for technology's sake**

---

## Context ID Model (Central Feature)

```
NWE-016  = Conversation Context (human-facing, durable reference)
INC-42   = Domain incident (separate entity, may be linked to context)
WF-93    = Remediation workflow (tied to incident UUID internally)
```

### Rules

- Every **new conversation** → new context key (`NWE-001`, `NWE-002`, …)
- **Replies in same conversation/thread** → same context (no new IDs per message)
- **Explicit reference** (`continue NWE-016`) → resolve existing, do not create
- **Atomic sequence allocation** in D1 — safe under concurrency
- **Cross-channel**: Web creates NWE-016 → Slack `continue NWE-016` → same context
- **Deep link**: `/context/NWE-016` restores full persistent context
- **Never** let LLM invent context IDs or treat arbitrary strings as valid keys

---

## Required Cloudflare Stack

| Component       | Implementation                                          |
| --------------- | ------------------------------------------------------- |
| LLM             | Workers AI — `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| Agent runtime   | Cloudflare Agents SDK (Durable Objects)                 |
| Real-time       | Agent WebSocket + client SDK                            |
| Persistent data | D1                                                      |
| Orchestration   | Cloudflare Workflows                                    |
| Memory          | Agent state + D1 (summary, facts, messages)             |
| Slack           | Events API + Agents Slack integration                   |
| Validation      | Zod                                                     |
| Testing         | Vitest + Cloudflare Workers test tooling                |
| Web UI          | React + TypeScript                                      |

**Do NOT add:** external DB, RAG/vector infra (unless justified later), Socket Mode for production Slack.

---

## Target Code Structure

```
src/
  agent/
    IncidentPilotAgent.ts
    prompts.ts
    state.ts
    context.ts
    tools/
      serviceHealth.ts, metrics.ts, logs.ts, deployments.ts
      dependencies.ts, context.ts, incidents.ts, remediation.ts
  workflows/
    incidentWorkflow.ts
  slack/
    handler.ts, auth.ts, normalization.ts, rendering.ts, approvals.ts
  domain/
    context.ts, incident.ts, service.ts, deployment.ts, remediation.ts
  db/
    schema/, migrations/, queries/, seed/
  ui/
    components/, chat/, conversations/, context/, workflow/, approvals/
  lib/
    ids.ts, validation.ts, errors.ts, config.ts
tests/
  unit/, integration/, workflows/, agent/, slack/, web/, e2e/
prompts/
docs/
  architecture.md, demo.md, security.md
```

---

## Task Breakdown (24 Tasks)

### TASK 1 — Bootstrap ✅

Create Cloudflare Agents starter. Verify: local app, Agent, WebSocket, React UI, Workers AI, typecheck, tests, build.

**Suggested commit:** `chore: bootstrap Cloudflare Agents starter`

---

### TASK 2 — Project Architecture ✅

Folder structure, config, domain types, errors, validation, database layer skeleton. No major business logic.

**Suggested commit:** `chore: establish project architecture and shared lib`

---

### TASK 3 — D1 and Domain Schema ⬜

Migrations: contexts, messages, services, deployments, metrics, logs, incidents, remediation, audit events, sequence allocation. Seed deterministic data.

**Suggested commit:** `feat: add D1 schema migrations and seed data`

---

### TASK 4 — Context ID Subsystem ⬜

`createContext`, `resolveContextKey`, `getContext`, `appendMessage`, `updateSummary`. Atomic NWE-XXX generation. Concurrency tests.

**Suggested commit:** `feat: implement context ID subsystem with atomic allocation`

---

### TASK 5 — Simulated Infrastructure ⬜

Five services, five deterministic demo scenarios. Query layer. Independent tests.

**Suggested commit:** `feat: add simulated infrastructure and demo scenarios`

---

### TASK 6 — IncidentPilot Agent ⬜

Real Agent: context awareness, Workers AI, system prompt, one read-only tool, basic conversation flow.

**Suggested commit:** `feat: implement IncidentPilot agent with context and basic tool calling`

---

### TASK 7 — Investigation Tools ⬜

All read-only investigation + context tools. Zod validation. Structured outputs. Tests.

**Suggested commit:** `feat: add investigation and context tools`

---

### TASK 8 — Investigation Intelligence ⬜

Multi-tool evidence gathering, hypothesis ranking. Test all 5 scenarios.

**Suggested commit:** `feat: implement multi-tool investigation intelligence`

---

### TASK 9 — Incident Domain Layer ⬜

Incident CRUD, timeline, state transitions, audit trail. Separate from context logic.

**Suggested commit:** `feat: implement incident domain layer and audit events`

---

### TASK 10 — Durable Remediation Workflow ⬜

Cloudflare Workflow: investigate → plan → approval wait → remediate → stabilize → verify → finalize. Idempotent steps.

**Suggested commit:** `feat: add durable remediation workflow`

---

### TASK 11 — Human Approval ⬜

Web approval UI + authorization. No LLM bypass. Test approve/reject/duplicate/stale/unauthorized.

**Suggested commit:** `feat: implement human approval with authorization checks`

---

### TASK 12 — Web Product UI ⬜

Sidebar, chat, streaming, tool cards, evidence, workflow timeline, approvals, deep links, reconnect.

**Suggested commit:** `feat: build web UI with context navigation and approvals`

---

### TASK 13 — Slack Adapter ⬜

Events API, signature verification, normalization, mentions, threads, idempotency, workspace isolation.

**Suggested commit:** `feat: add Slack Events API adapter`

---

### TASK 14 — Slack Approvals ⬜

Interactive approval buttons. Authorization chain. Workflow resume.

**Suggested commit:** `feat: implement Slack approval interactions`

---

### TASK 15 — Cross-Channel Context ⬜

Web → Slack → Web end-to-end. Same NWE-016 everywhere.

**Suggested commit:** `feat: enable cross-channel context continuation`

---

### TASK 16 — Memory and Summaries ⬜

Summaries, important facts, selective message loading. No full transcript injection.

**Suggested commit:** `feat: implement context memory and summarization`

---

### TASK 17 — Reliability ⬜

Failure cases: LLM fail, tool timeout, D1 fail, workflow retry, disconnect, etc.

**Suggested commit:** `fix: harden reliability and failure handling`

---

### TASK 18 — Evaluation Harness ⬜

Deterministic evaluation for 5 scenarios. Readable report.

**Suggested commit:** `test: add evaluation harness for demo scenarios`

---

### TASK 19 — Security Hardening ⬜

Secrets, auth, tenant isolation, approval bypass, prompt injection, SQL safety, Slack verification.

**Suggested commit:** `fix: security hardening pass`

---

### TASK 20 — Observability ⬜

Structured logging with context/workflow/incident metadata.

**Suggested commit:** `feat: add structured observability logging`

---

### TASK 21 — Documentation ⬜

README, AI_ASSISTANCE.md, docs/architecture.md, demo.md, security.md.

**Suggested commit:** `docs: add architecture, demo, and setup documentation`

---

### TASK 22 — Prompt History ⬜

`prompts/001-*.md` through `014-*.md` — honest AI-assisted development record.

**Suggested commit:** `docs: add prompt history for AI-assisted development`

---

### TASK 23 — Final Polish ⬜

UI, errors, loading states, type safety, naming, demo clarity.

**Suggested commit:** `chore: final polish and UX improvements`

---

### TASK 24 — Final Verification ⬜

Full test suite, build, deployment validation. Engineering report.

**Suggested commit:** `chore: final verification and release readiness`

---

## Five Demo Scenarios (Deterministic)

| #   | Service          | Root Cause                               | Must NOT Do                 |
| --- | ---------------- | ---------------------------------------- | --------------------------- |
| 1   | checkout-service | Deployment v42 regression                | —                           |
| 2   | payments-service | Dependency/DB degradation                | Recommend rollback          |
| 3   | auth-service     | Traffic spike / rate limits              | Blame deployment            |
| 4   | (varies)         | False correlation — deployment not cause | Blindly blame latest deploy |
| 5   | (varies)         | Rollback fails — service stays unhealthy | Report false success        |

---

## Tools Checklist

### Investigation (read-only)

- [ ] getServiceHealth
- [ ] getRecentMetrics
- [ ] getRecentLogs
- [ ] getRecentDeployments
- [ ] getServiceDependencies

### Context (read-only)

- [ ] getContextByKey
- [ ] getContextSummary
- [ ] getRelevantContextMessages

### Incident

- [ ] getIncidentById
- [ ] getIncidentHistory
- [ ] getIncidentTimeline
- [ ] searchActiveIncidents
- [ ] createIncident

### Remediation (mutation — approval required)

- [ ] proposeRemediation
- [ ] executeRemediation (only after real user approval)

---

## D1 Tables Checklist

- [ ] conversation_contexts
- [ ] conversation_messages
- [ ] context_sequence (atomic allocation)
- [ ] services
- [ ] deployments
- [ ] metrics
- [ ] logs
- [ ] incidents
- [ ] remediation_actions
- [ ] incident_events
- [ ] context_events (lifecycle)
- [ ] slack_event_idempotency (if needed)

---

## Definition of Done (Summary)

See assignment §72 for full checklist. Key gates:

- [ ] Same Agent for Web + Slack
- [ ] Context IDs work cross-channel
- [ ] Tool calling with Workers AI Llama 3.3
- [ ] Durable Workflow with approval wait
- [ ] Verification classifies RESOLVED / PARTIALLY_RECOVERED / NOT_RESOLVED
- [ ] LLM cannot bypass approval
- [ ] Unit + integration + workflow + Slack + web tests
- [ ] Evaluation harness for 5 scenarios
- [ ] Documentation + prompt history + AI_ASSISTANCE.md

---

## End-to-End Demo Flow (Must Work Reliably)

```
Web: new conversation → NWE-016
Web: "Investigate checkout-service" → agent investigates
Slack: "@IncidentPilot continue NWE-016" → same context
Slack: approval of rollback → workflow resumes
Web: /context/NWE-016 → shows full history + resolution
Slack: new thread → NWE-017 (NWE-016 untouched)
```

---

## Commit Guidelines (For User)

- One logical commit per completed task (suggested messages above)
- Conventional commits: `feat`, `fix`, `chore`, `docs`, `test`
- Do not squash everything at the end
- Agent will **notify when a task is complete** and suggest a commit message
- Agent will **never commit** unless explicitly asked

---

## Session Notes

| Date       | Session             | Notes                                                                                  |
| ---------- | ------------------- | -------------------------------------------------------------------------------------- |
| 2026-09-12 | TASK 2 Architecture | Cloudflare MCP/skills setup, env docs, domain/lib/db/agent structure, 9 tests passing. |

---

## Key References

- Assignment spec (full build specification — provided in initial prompt)
- [Cloudflare Agents SDK docs](https://developers.cloudflare.com/agents/)
- [Workers AI](https://developers.cloudflare.com/workers-ai/)
- [D1](https://developers.cloudflare.com/d1/)
- [Workflows](https://developers.cloudflare.com/workflows/)
- Model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

---

## When Resuming Work

1. Read this file first
2. Check git log for last completed task
3. Update "Current Status" section
4. Continue from next unchecked task
5. Run tests before marking task complete
6. Tell user task is done + suggested commit message
