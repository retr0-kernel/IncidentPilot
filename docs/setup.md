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

```bash
npm install
npm run types      # after wrangler.jsonc changes — writes env.d.ts only
npm run dev        # http://localhost:5173
npm run check      # format + lint + typecheck
npm run test       # unit + worker tests
npm run build      # production build (same step as deploy, without wrangler deploy)
```

Use `npm run types`, not bare `wrangler types`. The bare command creates an extra `worker-configuration.d.ts` file that is not used by this project.

## 6. What to tell the agent

When starting a new session, you can say:

> Account ID is `3dfafea489fd6dc32d8407e75c9ded36`, wrangler is logged in, continue from PLAN.md.

No need to paste API tokens into chat — keep those in `.dev.vars` or your shell profile only.
