---
name: backend-rules
description: MANDATORY pre-work checklist for ANY AI model working in the DeploymentPlanner AI backend (Express + Mongoose). Use when the user asks to add a feature, fix a bug, refactor, review, or write any code here — read every rules file FIRST, then build per docs/conventions.md + docs/ocp.md, then verify with typecheck, lint, and tests before claiming done.
license: MIT
compatibility: any agentic model/tool (Claude Code, opencode, Codex, Cursor, Cline, goose, Aider, ...) — standard SKILL.md format
metadata:
  project: DeploymentPlanner AI backend
  scope: backend (also valid repo-wide)
---

# Backend Rules skill — read BEFORE you write a single feature

You are an AI assistant working in the **DeploymentPlanner AI backend**. This
skill is a **rule, not advice**: a team member asking you for a feature does
NOT lift you from it.

## Step 0 — Load every rules file before starting ANY change

Do this in the same turn the user asks for work, BEFORE planning the
implementation. Read each file; if one is missing in the current repo, say so
instead of guessing the rules:

| # | File | Governs |
|---|---|---|
| 1 | `backend/docs/conventions.md` | Architecture: dependency direction, composition root, functional factories, types criterion, zod v4, async contract, complexity budget (cc ≤ 9), shared helpers (`hexIdSchema`/`parseOrThrow`), route order |
| 2 | `backend/docs/ocp.md` | Open-Closed Principle: strategy + registry pattern, when NOT to use it, the review checklist, the sweep-verified evidence |
| 3 | `backend/docs/domain-model.md` | The domain entities + status machines the code must mirror |
| 4 | `backend/src/<layer>/README.md` | Per-layer rules: `services`, `controllers`, `routes`, `repositories`, `models`, `domain`, `shared`, `types` (8 files) |
| 5 | `backend/README.md` | Setup, npm scripts (`db:sync-indexes`, `db:backfill-user-status`), deploy-mandatory migrations |

If asked to work on something whose rules are NOT covered by these files:
stop, list what is missing, and ask the team before inventing structure.

## Step 1 — Re-check OCP before adding anything

`docs/ocp.md` is enforced with verified evidence. Your duties:

- **Zero `switch`/`case` in runtime `src/`.** Verify mechanically before
  finishing:
  ```sh
  cd backend && grep -rn "switch (\|case '" src/
  # must output NOTHING
  ```
- Per-kind behavior lives in **data arrays** (`GENERATED_FILE_KINDS`,
  `KINDS_REQUIRING_PLAN`, `PROJECT_ENVIRONMENTS`, `error-status-table`,
  `defineStateMachine` transitions, declared indexes). Adding a kind =
  extending the data row. NEVER edit a dispatcher.
- A THIRD branch per discriminator anywhere → mandatory strategy + registry
  (one strategy file per case, registry fails loud at boot: `verify()` +
  unknown-key domain error + duplicate-registration error). See
  `docs/ocp.md` §3 and the NOT-to rubric — 2 stable branches stay a plain
  `if`, over-engineering is also a violation.
- Feature PRs are line-dominated by ADDITIONS: new file + one registration
  line; zero edits inside existing strategies/dispatchers/contracts.

## Step 2 — Write clean code, house style (from conventions.md)

- **Dependency direction** `routes → controllers → services → repositories →
  models/entities`; all layers may import `domain/` + `types/` + `shared/`;
  layer-local contracts are derived at source with `ReturnType<typeof
  createXxxService>`; the `src/types/` barrel is ONLY for contracts
  consumed across layers (e.g. by middleware).
- **Composition root is `src/routes/index.ts`** (and `server.ts`, `app.ts`,
  valid scripts + test helpers): the ONLY readers of `getEnv()`.
  `config/database.ts` takes the URI + autoIndex from callers.
- **Services = functional factories** (closures, no classes, no `this`),
  deps injected with default-wiring (`createXService(
  repo = new Repo())`).
- **Controllers** validate via `parseOrThrow` from
  `src/shared/validation/request-validation.ts`; id schemas compose
  `hexIdSchema`. Inline `safeParse` + `AppError` blocks and any redeclared
  id-regex are BANNED.
- **Route lines** declare path + guard + controller inline; specific routes
  mount BEFORE `/:id` routes (see the `/users/pending` rule).
- **Middleware imports contracts only from `src/types/`** — `require-auth`
  is THE exception pattern (factory-injected).
- **One model method per mutation, ONE save per request mutation.**
- **Async/await only** — `.then`/.catch chains and `new Promise` sleeps are
  banned; zod v4 (`z.strictObject`, `z.flattenError`).
- **Errors**: one domain error class per code, status via
  `middleware/error-status-table.ts`; ownership checks live IN THE QUERY
  (anti-IDOR: foreign resource = not found, never "forbidden").
- **No secrets in code or logs.** Env values arrive as parameters.

## Step 3 — Verify before you say "done"

Run from `backend/` and make ALL THREE pass; report their status explicitly:

```sh
npm run typecheck
npm run lint
npm test
```

If a check fails: fix and rerun. Never finish with red gates, and never
weaken a rule, a test, or a lint rule to pass them. New tests:
**by addition** — a new feature ships its own spec (service-level +
HTTP-level when there are endpoints); never rewrite existing tests' logic.

## Step 4 — When rules conflict with the request

Rules win. If the team's request breaks a documented rule, (1) say which
rule file and section it collides with, (2) propose the rule-abiding
alternative, (3) ask. Only the team may change a rules file via their own
review — never you, silently.

## Reference shortcuts

- Composition root to copy: `src/routes/index.ts`
- Controller style to copy: `src/controllers/project.controller.ts`
- Service style to copy: `src/services/project/project.service.ts`
- Factory route style to copy: `src/routes/project.routes.ts`
- Test style to copy: `tests/services/project.service.spec.ts`,
  `tests/http/developer-approval-flow.spec.ts`
