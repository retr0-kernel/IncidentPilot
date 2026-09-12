# IncidentPilot — Local Setup

This guide explains what you need on your machine, what the agent needs from you, and when each variable becomes required.

## 1. Cloudflare agent tooling (Cursor)

Per [Cloudflare agent setup](https://developers.cloudflare.com/agent-setup/prompt.md):

| Step   | What                                                 | Why                                                                       |
| ------ | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| Skills | `cloudflare/skills` installed to `~/.agents/skills/` | Gives Cursor up-to-date Cloudflare, Agents SDK, and Wrangler guidance     |
| MCP    | `.cursor/mcp.json` in this repo                      | Lets the agent query Cloudflare docs, bindings, builds, and observability |

**After MCP setup:** restart Cursor (or reload the window) so the Cloudflare MCP servers connect. OAuth opens automatically the first time a Cloudflare MCP tool is used.

## 2. Wrangler authentication (you)

You are already logged in via OAuth (`wrangler whoami`).

| Item       | Value                              | Used for                           |
| ---------- | ---------------------------------- | ---------------------------------- |
| Account    | `krish22092003@gmail.com`          | Deployments, D1, Workers AI        |
| Account ID | `3dfafea489fd6dc32d8407e75c9ded36` | API calls, CI, non-interactive dev |

For **local dev**, OAuth from `wrangler login` is enough — no token file required.

For **CI or headless environments**, create an API token with Workers, D1, and AI permissions and set:

```bash
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=3dfafea489fd6dc32d8407e75c9ded36
```

## 3. Environment files

| File                | Committed? | Purpose                                             |
| ------------------- | ---------- | --------------------------------------------------- |
| `.env.example`      | Yes        | Documents all env vars across the project lifecycle |
| `.dev.vars.example` | Yes        | Template for Wrangler local secrets                 |
| `.dev.vars`         | **No**     | Your local secrets — copy from `.dev.vars.example`  |
| `.env`              | **No**     | Optional; only if a tool outside Wrangler needs it  |

### Copy local secrets

```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars if you add Slack credentials later
```

## 4. When each variable is needed

| Variable            | Required from | Purpose                                  |
| ------------------- | ------------- | ---------------------------------------- |
| Wrangler OAuth      | TASK 1 (now)  | `npm run dev`, Workers AI remote binding |
| `CONTEXT_ID_PREFIX` | TASK 4        | Prefix for context keys (`NWE-001`)      |
| `DB` (D1 binding)   | TASK 3        | Persistent contexts, incidents, messages |
| `SLACK_*`           | TASK 13       | Slack Events API integration             |

## 5. Daily commands

See **`docs/local-testing.md`** for the full local testing playbook.

```bash
npm install
npm run db:setup:local   # first time only
npm run dev              # http://localhost:5173
npm run check && npm run test && npm run build
```

Use `npm run types`, not bare `wrangler types`. The bare command creates an extra `worker-configuration.d.ts` file that is not used by this project.

## 6. D1 database (TASK 3)

Remote database: **`incidentpilot-db`**  
Database ID: **`9f291cbc-351f-43a1-8374-95795a37235f`**  
Binding name in Worker code: **`env.DB`**

### First-time / fresh machine setup

```bash
npm run db:setup:local    # migrate + seed local D1
```

### Individual commands

```bash
npm run db:migrate:local   # apply migrations to local D1
npm run db:seed:local      # load deterministic demo data locally
npm run db:migrate:remote  # apply migrations to Cloudflare (needs auth)
npm run db:seed:remote     # load demo data remotely (needs auth)
```

Migrations live in `src/db/migrations/`. Seed data lives in `src/db/seed/`.

## 7. API token — when you need one

**You do not need an API token for normal local development** if `wrangler login` works (you already have this).

Create a token only for CI, headless shells, or when OAuth is unavailable.

### Recommended Cloudflare API token permissions

Create a custom token at [Cloudflare API tokens](https://dash.cloudflare.com/profile/api-tokens) with:

| Permission                     | Access | Why                                   |
| ------------------------------ | ------ | ------------------------------------- |
| **Account → Workers Scripts**  | Edit   | Deploy Worker, run dev with remote AI |
| **Account → Workers AI**       | Edit   | Llama 3.3 inference                   |
| **Account → D1**               | Edit   | Migrations, seed, queries             |
| **Account → Workers KV**       | Edit   | Optional future use                   |
| **Account → Account Settings** | Read   | Account scoping                       |

Include account resources for: **`3dfafea489fd6dc32d8407e75c9ded36`**

Then set:

```bash
export CLOUDFLARE_API_TOKEN=your-token-here
export CLOUDFLARE_ACCOUNT_ID=3dfafea489fd6dc32d8407e75c9ded36
```

Or add to `.dev.vars` (gitignored):

```bash
CLOUDFLARE_API_TOKEN=your-token-here
CLOUDFLARE_ACCOUNT_ID=3dfafea489fd6dc32d8407e75c9ded36
```

## 8. Deployed URL

The worker is named **`incidentpilot`**. It is **not deployed yet** on your account.

After deploy:

```bash
npm run deploy
```

Your public URL will be printed in the terminal, typically:

```
https://incidentpilot.<your-subdomain>.workers.dev
```

Use local dev (`http://localhost:5173`) for day-to-day development. Deploy when you need a shareable link or Slack Events API callback URL.

## 9. What to tell the agent

When starting a new session, you can say:

> Account ID is `3dfafea489fd6dc32d8407e75c9ded36`, wrangler is logged in, read `docs/TECH.md`, continue from TASK 4.

No need to paste API tokens into chat — keep those in `.dev.vars` or your shell profile only.
