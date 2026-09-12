# IncidentPilot

AI-powered engineering/SRE assistant on Cloudflare. Investigates operational problems using tool calling, persists conversation context across Web and Slack, requires human approval before mutations, and runs remediation through durable Workflows.

## Quick start

```bash
npm install
npm run types   # generate Worker env types
npm run dev     # local dev server (http://localhost:5173)
```

**Cloudflare authentication is required for local dev.** Workers AI uses a remote binding (`"ai": { "remote": true }`). Run `wrangler login` or set `CLOUDFLARE_API_TOKEN` in `.env` (see `.env.example`).

## Scripts

| Command                  | Description                                    |
| ------------------------ | ---------------------------------------------- |
| `npm run dev`            | Start Vite dev server with Agent + WebSocket   |
| `npm run check`          | Format, lint, and typecheck                    |
| `npm run test`           | Run Vitest with Cloudflare Workers test plugin |
| `npm run build`          | Production build                               |
| `npm run db:setup:local` | Migrate + seed local D1 demo data              |
| `npm run deploy`         | Build and deploy to Cloudflare                 |

## Architecture (bootstrap)

```
React UI  ──WebSocket──▶  IncidentPilotAgent (Durable Object)
                               │
                               ├── Workers AI (Llama 3.3)
                               ├── Agent state (SQLite)
                               ├── D1 (contexts, incidents, demo infra)
                               └── Tools (weather, calc, schedule, …)
```

Full architecture and build status: **`docs/TECH.md`** (updated each task).  
Setup and auth: **`docs/setup.md`**. Local testing: **`docs/local-testing.md`**.

## Project structure

```
src/
  index.ts                  # Worker entry
  agent/                    # IncidentPilotAgent + tools
  domain/                   # TypeScript domain types
  db/                       # D1 migrations, seed, client
  ui/                       # React chat
docs/
    setup.md, local-testing.md
tests/
```

## AI assistance

See `AI_ASSISTANCE.md` (TASK 21) and `prompts/` (TASK 22) for development history.
