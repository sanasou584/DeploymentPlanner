# DeploymentPlanner AI — backend

Express + Mongoose modular monolith. Hard-mode TypeScript (strict +
`noUncheckedIndexedAccess`), Mongoose 9, ES modules (NodeNext), ESLint 9 flat
config, Vitest.

- `docs/domain-model.md` — ER diagram, state machines, cross-document rules &
  transactions, deviations from the initial report.
- `docs/conventions.md` — folder rules, dependency direction, how to add a
  model / state machine, error handling, testing.
- `docs/ocp.md` — Open-Closed Principle rule: strategy + registry pattern,
  when NOT to use it, review checklist.
- Agent skill for AI models (any tool): `skills/backend-rules/SKILL.md`.
  Browser models (claude.ai, no filesystem access): paste
  `skills/backend-rules/CLAUDE-BROWSER.md` as the first message instead —
  it is the same contract, fully inline, zero repo reads needed.
  opencode already discovers it via project `.opencode/skills/` and the
  `~/.agents/skills` / `~/.claude/skills` symlinks; other tools (Claude
  Code, Codex, Cursor, Cline...) read `../AGENTS.md` at the repo root,
  which points to the same file. One canonical file, one symlink per tool
  keeps it in sync:
    ln -sfn <repo>/backend/skills/backend-rules ~/.agents/skills/backend-rules
    ln -sfn <repo>/backend/skills/backend-rules ~/.claude/skills/backend-rules
- **AI coding assistants** must read `docs/conventions.md` + `docs/ocp.md`
  before generating code in this repo; their rules are enforced by ESLint
  and code review.

## Requirements

- Node 22+ (top-level await + `tsx` used by scripts)
- MongoDB: local (to run transactions later you need a **replica set** — Atlas
  works out of the box) or in-memory for tests (handled automatically)
- npm

## Setup

```bash
npm ci                         # install (or npm install for the first time)
cp .env.example .env           # then edit the values
openssl rand -base64 32        # put the output in TOKEN_ENCRYPTION_KEY
```

`.env` variables (validated once at startup, fail fast):

| Variable | Meaning |
|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` (default `development`) |
| `PORT` | HTTP port (default 4000) |
| `MONGODB_URI` | Connection string (required) |
| `CORS_ORIGINS` | Comma-separated browser origins (required) |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` (default `info`) |
| `TOKEN_ENCRYPTION_KEY` | Base64 that decodes to exactly 32 bytes — AES-256-GCM key for GitHub tokens (required) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth app credentials (required) |
| `GITHUB_CALLBACK_URL` | e.g. `http://localhost:4000/api/v1/auth/github/callback` (required) |
| `FRONTEND_URL` | Browser origin for post-login redirects (required) |
| `SESSION_SECRET` | Random string ≥ 32 bytes — session token signing (required; generate with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`) |

## Scripts

```bash
npm run dev              # tsx watch --env-file-if-exists=.env src/server.ts
npm run build            # tsc -p tsconfig.build.json  → dist/
npm run typecheck        # tsc --noEmit over src/ + compile-time type tests
npm start                # node dist/server.js
npm run lint             # eslint .
npm run format           # prettier --write .
npm test                 # vitest run (unit + model + repository + http)
```

### Index sync

`autoIndex` is disabled in production — declared indexes (e.g. the partial
unique `(owner, name)` on projects) are only created by the sync script:

```bash
npm run db:sync-indexes            # dry-run: prints the declared-vs-current diff
npm run db:backfill-user-status    # one-time data migration (pre-approval users)

npm run db:sync-indexes -- --apply # creates/drops the diff (run this on every deploy)
```

`db:backfill-user-status` is a ONE-TIME data migration: it stamps the
`User.status` field introduced by the approval workflow onto every user that
predates it (`deletedAt: null -> ACTIVE`, else `DISABLED`). Existing users in
the database have no `status` until it runs — without it nobody (including
admins) can authenticate.

That script is mandatory on every deploy: unique and partial indexes only exist
if it ran there. It exits non-zero if any model fails to sync.

- **Always review the dry run first.** `--apply` creates every index the schemas
  declare AND **drops every index the database has that a schema no longer
  declares** — including indexes added manually by a DBA.
- Env vars are loaded from `.env` when the file exists (`--env-file-if-exists`).
  `MONGODB_URI` must come from the environment (or `.env` locally); the
  `--uri` flag exists only for local development against a throwaway database —
  never use it on production platforms, where the platform injects env vars.
- The script keeps `autoIndex` disabled for its own connection regardless of
  `NODE_ENV`, so a dry run can never auto-build indexes behind the scenes;
  only `--apply` writes.

## Current status

Phases 0–4 delivered, Phase 5 wrap-up in progress:

- environment contract, DB connection, Express app/middleware, logging
- domain primitives: enums, errors + central HTTP status table, value objects
  (k8s quantities, GitHub URL), framework-free state machines
- **composition pattern** (see `docs/conventions.md` — "Composition"):
  `app.ts` imports ONLY routes; each `routes/<feature>.routes.ts` wires its
  own services (`createXxxService()` factories) + controllers; services
  self-wire their repositories so `routes/` and `app.ts` never touch them
- 10 models (User, GithubConnection, Project, Analysis, Recommendation,
  DeploymentPlan, GeneratedFile, Deployment, WorkflowRun, AuditLog) with
  behavior methods, invariants, indexes; soft delete on User/Project
- BaseRepository + one repository per model with the contracts of Phase 4
- 311 tests green (`build` + `lint` + `typecheck` + `test`)
- HTTP layer delivered so far: `GET /health`, `/api/v1/auth` (register + login,
  GitHub OAuth start/callback)

## Next (for the team)

Everything the spec schedules after the model/repository groundwork:

- services: registration/login/auth guards (JWT not yet chosen — decide
  `jose` vs `@fastify/jwt`-style against Express), session/cookie strategy,
  the cross-document orchestration listed in `docs/domain-model.md`
- controllers + routes + DTO validation (zod) per resource; API docs (http
  spec) and rate limiting; consistency between `WorkflowRun.subject.type`
  enum values and mongoose model names at populate time
- GitHub ingestion/archive download + git ref resolution using the decrypted
  token (`GithubConnection.getAccessToken` accepts the 32-byte key)
- AI analysis pipeline (repository analysis, `Recommendation.fromAi`),
  preview runner + GitHub Actions workflow execution, Argo-CD status sync
  (`Deployment.recordArgoStatus/recordGitopsCommit`)
- production hardening: logging redaction review, TLS/reverse-proxy notes,
  replica set provisioning for transactions, backup strategy
