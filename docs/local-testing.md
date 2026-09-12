# Local Testing Guide

Quick reference for running and verifying IncidentPilot on your machine.

## Prerequisites

```bash
wrangler whoami    # must show logged in
cp .dev.vars.example .dev.vars
npm install
npm run db:setup:local
```

## Start the app

```bash
npm run dev
```

| What        | URL                             |
| ----------- | ------------------------------- |
| Web UI      | http://localhost:5173           |
| Debug panel | http://localhost:5173/\_\_debug |

Wait for **Connected** (green dot) in the header before chatting.

## Try these prompts

```
What's the weather in Tokyo?
What timezone am I in?
Calculate 5000 * 3          → should show approval UI
Remind me in 2 minutes to stretch
```

## Run automated tests

```bash
npm run format    # if npm run check complains about formatting
npm run types && npm run check && npm run test && npm run build
```

Expect **19 tests passing**.

## Inspect D1 demo data

```bash
wrangler d1 execute incidentpilot-db --local --command \
  "SELECT name, status FROM services ORDER BY name"
```

## Deploy to a public URL (optional)

```bash
npm run deploy
```

Wrangler prints your live URL, typically:

```
https://incidentpilot.<your-subdomain>.workers.dev
```

First deploy also runs remote D1 migrations if configured. Demo seed on remote:

```bash
npm run db:seed:remote
```

## Share local dev externally

While `npm run dev` is running, press **`t`** then Enter to open a Cloudflare tunnel URL (useful for Slack webhook testing later).

## Troubleshooting

| Problem                                  | Fix                                                               |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `Missing script: build`                  | Pull latest; `build` is in `package.json`                         |
| Format check fails on `PLAN.md`          | `PLAN.md` is gitignored — run `npm run format`                    |
| `worker-configuration.d.ts` format error | Delete file; use `npm run types` not bare `wrangler types`        |
| AI errors in chat                        | Run `wrangler login` or set token in `.dev.vars`                  |
| Empty D1                                 | Run `npm run db:setup:local`                                      |
| Only 9 tests (not 19)                    | Pull latest TASK 3 — integration tests in `tests/integration/db/` |

More detail: [TECH.md](./TECH.md) and [setup.md](./setup.md).
