# IncidentPilot

AI-powered engineering/SRE assistant on Cloudflare. Investigates operational problems using tool calling, persists conversation context across Web and Slack, requires human approval before mutations, and runs remediation through durable Workflows.

> **Status:** TASK 1 complete — Cloudflare Agents bootstrap with WebSocket chat, Workers AI (Llama 3.3), React UI, Vitest, and build pipeline.

## Quick start

```bash
npm install
npm run types   # generate Worker env types
npm run dev     # local dev server (http://localhost:5173)
```

**Cloudflare authentication is required for local dev.** Workers AI uses a remote binding (`"ai": { "remote": true }`). Run `wrangler login` or set `CLOUDFLARE_API_TOKEN` in `.env` (see `.env.example`).

## Scripts

| Command          | Description                                    |
| ---------------- | ---------------------------------------------- |
| `npm run dev`    | Start Vite dev server with Agent + WebSocket   |
| `npm run check`  | Format, lint, and typecheck                    |
| `npm run test`   | Run Vitest with Cloudflare Workers test plugin |
| `npm run deploy` | Build and deploy to Cloudflare                 |

## Architecture (bootstrap)

```
React UI  ──WebSocket──▶  IncidentPilotAgent (Durable Object)
                               │
                               ├── Workers AI (Llama 3.3)
                               ├── Agent state (SQLite)
                               └── Tools (weather, calc, schedule, …)
```

Full architecture is documented in `PLAN.md` and will expand through TASK 2–24.

## Project structure

```
src/
  server.ts       # IncidentPilotAgent — AIChatAgent with tools
  app.tsx         # React chat UI
  client.tsx      # React entry
  styles.css      # Tailwind + Kumo styles
tests/
  bootstrap.test.ts
prompts/          # (TASK 22) AI-assisted development history
docs/             # (TASK 21) architecture, demo, security
PLAN.md           # Implementation plan and progress tracker
```

## AI assistance

See `AI_ASSISTANCE.md` (TASK 21) and `prompts/` (TASK 22) for development history.
