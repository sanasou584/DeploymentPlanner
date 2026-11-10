# Claude (browser) edition of `backend-rules` — free-tier, copy-paste workflow

**For the human:** open a NEW conversation on claude.ai, paste this whole
file as the first message, then ask for your feature below it. This model
has NO access to the project: it writes code, YOU (team member) create/patch
the files by copy-paste, then run the verification commands locally.

---

You are writing code for the **DeploymentPlanner AI** backend (Express +
Mongoose + zod v4 + TypeScript, Node ESM with `.js` import suffixes, vitest +
supertest). A team member pastes code from your answers into the repo BY
HAND. All the rules in this message are the team's non-negotiable contract.

## 0. The copy-paste workflow — how you MUST answer (the most important rules)

1. **Never output diffs, ellipses, "…", or fragments of existing files.**
   Every new file: complete, top-to-bottom, buildable content, even lines
   that seem obvious.
2. **Label every deliverable exactly like this**:
   - `### NEW FILE backend/src/services/.../x.service.ts` — create this path
     and its folders, paste the whole content.
   - `### EDIT FILE <exact path>` — show the EXACT existing block to find,
     the replacement block, and say "replace only this". For the composition
     root this is typically one import line + one registration block.
3. **Assume ONLY the documented backbone exists** (section 1 + the public
   contracts in section 3). Never import from a file you did not see or that
   is not listed here. If you need something that may not exist, say:
   "IF your repo already has `X`, use it; ELSE create it with this content".
4. Group your answer as a **WORK ORDER**, applied strictly in order:
   1) a one-para summary of what we build and where it lives,
   2) NEW FILES (whole contents) in dependency order (domain → shared →
   schema → model → repository → service → controller → routes/composition
   → tests),
   3) EDIT FILE blocks for existing files (surgical: one line or clearly
   block-scoped),
   4) commands the team member runs to create folders + verify (see §7),
   5) note anything the team must confirm (naming collisions, existing
   helpers).
5. **Extension is by ADDITION**: new feature = new file + one registration
   line in the composition root. You never ask anyone to delete or rewrite
   working code from the backbone.

## 1. Context-free project map (the ONLY structure you may assume)

```
backend/src/
  app.ts             # express assembly — imports ONLY routes/index.ts' createApiRouter
  server.ts          # the only module that listens + connects MongoDB
  routes/            # index.ts = THE composition root; per-feature routers
  controllers/       # per-feature factories: parse input, call service, send JSON
  services/          # per-feature folders: business rules (closures, NO classes)
  repositories/      # BaseRepository subclasses (queries only)
  models/entities/   # Mongoose schemas + behavior methods (User, Project, ...)
  middleware/        # require-auth, require-role, error-handler, logging
  domain/            # errors, enums, state machines
  shared/            # validation helpers, crypto, logging
  types/             # cross-layer DTOs + service contracts (barrel index.ts)
  config/            # env.ts (getEnv), database.ts (connectDatabase helper)
  scripts/           # admin:create, db:sync-indexes, db:backfill-user-status
backend/tests/       # models, repositories, services, http, integration… 
```

Two rules that make hand-paste work:
- one folder per FEATURE under `services/` (e.g. `services/notifications/`
  with `x.service.ts` + `x.schema.ts`); a NEW feature never creates code
  inside existing feature folders.
- the composition root registration is the ONLY line among existing files
  that new features usually touch (`routes/index.ts`).

## 2. Before writing anything

1. Restate the feature in ONE sentence, then list: "new files: …; edited
   files: …".
2. Cite which rules (§3/§4) apply. If the request conflicts with a rule:
   STOP, name the rule, propose the compliant alternative, ask ONE question.
3. Silence is not consent: never silently deviate.

## 3. Backbone you may import from — exact contracts

| Contract | Where | Rule for you |
|---|---|---|
| `hexIdSchema`, `parseOrThrow(schema, data, message)` | `backend/src/shared/validation/request-validation.ts` | assume exists; controllers/schema files import it from `'../../shared/validation/request-validation.js'` (adapt the number of `../` to the file depth) — NEVER re-create the 24-hex regex inline |
| AppError subclasses | `domain/errors/index.js` via layer-`../domain/errors/index.js` | use BASE error classes ONLY: UnauthorizedError/ForbiddenError/AccountDisabledError/NotFoundError/ConflictError/InvalidStateTransitionError/InvariantViolationError (one per concern; body → 400 VALIDATION_ERROR via parseOrThrow) |
| state machines | `domain/state-machine/define-state-machine.ts` (`assertTransition(from,to)`) | statuses as data: better to extend an existing entity's machine than invent a new one |
| Mongoose base | `repositories/base.repository.ts`: `BaseRepository` + `paginate(filter, {page, limit, sort})` | repositories are thin subclasses; filters are the strict object shape; ownership IN THE FILTER |
| soft delete plugin | `models/plugins/soft-delete.ts` (`SoftDeletableMethods`, `withDeleted` option) | deleting = `softDelete()`; queries exclude deleted by default |
| env | `config/env.ts` `getEnv()` (getEnv → composition roots only) | services/config never read env |
| AuthUser/`UserService`/`SessionTokenService` | `types/index.ts` | guard middleware + reuse DTOs; request principal: `res.locals.authUser` + `res.locals.userId`, set ONLY by `requireAuth` |
| routes | each feature router = `createXxxRouter(deps…)` factory | present your router as a NEW FILE composed in `routes/index.ts` by Ellis `createApiRouter()` |

Anything else must be created as a NEW FILE (labelled §0.2), even if a twin
probably exists in the repo — then add to the WORK ORDER a note:
"probable duplicate: replace-call the team; the naming rule bans
redeclarations".

## 4. Architecture rules (always)

- **Dependency direction:** routes → controllers → services → repositories
  → models/entities; everyone may import `domain/`, `types/`, `shared/`.
  Reverse imports = bug. Middleware never imports services (it takes
  injected deps).
- **Composition root**: only `routes/index.ts` (and `server.ts`, scripts,
  test helpers) may call `getEnv()`. `database.ts` receives
  `connectDatabase(uri, { autoIndex })`. `autoIndex: env.nodeEnv !==
  'production'` in server.
- **Routes**: one line per endpoint (path + guard + controller factory);
  specific literals mount BEFORE `/:id` (e.g. `/users/pending` before
  `/users/:id`).
- **Services** = functional factories returning closures, deps default-wired:
  ```ts
  export function createXService(repo = new XRepository()) {
    async function doThing(userId: string, input: XxxInput) { … }
    return { doThing, other };
  }
  export type XService = ReturnType<typeof createXService>;
  ```
  forbid classes/`this`/config reads/singletons.
- **Controllers**: factories per HANDLER, all parsing via `parseOrThrow`
  (leave the `message` argument helpful: `'Invalid xxx data'`).
  Authenticated calls read the principal from `res.locals.authUser`/
  `res.locals.userId`. Success = `{ message, data }`; list =
  `{ message, data, pagination: { page, limit, total, pageCount } }`.
- **Model methods** = one mutation, one save: a multi-field update goes
  through ONE `applyUpdate`-style method; empty-patch = `new
  InvariantViolationError(...)`.
- **Async/await only** (no `.then()`, no `new Promise` sleeps).
- **Complexity:** helpers ≤ cc 9 — extract steps into named functions.
- **Errors** (fixed vocabulary + HTTP codes):
  UNAUTHORIZED 401 · FORBIDDEN 403 · ACCOUNT_DISABLED 403 · NOT_FOUND 404 ·
  CONFLICT 409 · INVALID_STATE_TRANSITION 409 · INVARIANT_VIOLATION 500 ·
  VALIDATION_ERROR 400. Failure shape: `{ error: { code, message, details? } }`.
- **State machine, status** (default document): PENDING → ACTIVE |
  REJECTED (terminal) ; ACTIVE ↔ DISABLED. Degraded accounts cannot
  authenticate (login → 403 `FORBIDDEN` "Account is not approved…";
  deactivated → 403 `ACCOUNT_DISABLED`). Login success JSON:
  `{ message, data, accessToken, tokenType: 'Bearer', expiresIn }` with
  `Cache-Control: no-store`.

## 5. Open-Closed Principle — enforced with zero tolerance

- **ZERO `switch`/`case` in runtime code.** If your solution wants one,
  restructure.
- Per-kind/per-type behavior lives in **data arrays** (generations kinds,
  statuses, error table, transitions, indexes). New kinds = one array row.
- A THIRD branch per discriminator → mandatory **strategy + registry**:
  one file per strategy, a registry with `register()` (duplicate → error at
  boot), each strategy validates via `verify()` boot-time, unknown keys
  throw a domain error. Two stable branches stay a single `if`. Do NOT
  over-engineer 2 branch pairs either.
- Never edit existing strategies, dispatchers, or contracts in EDIT blocks.
- Feature diffs must be line-dominated by ADDITIONS.

## 6. Style guardrails

- zod v4 only (`z.strictObject`, `z.flattenError`, `z.coerce.number()`).
- No new npm dependencies without an explicit "ASK FIRST" justification.
- No comments in code unless the team asked for some; English like the
  surrounding files.
- Commit conventions to hand back: atomic commits with `Adem:` prefix —
  give ONE proposed message per logical change.
- Don't touch lockfiles; don't invent `.env` values; never invent secrets.

## 7. Final section of EVERY work order: verification commands

Copy to the team member paste this at the end, from `backend/`:

```sh
# create folders for new files (example — adjust to your work order):
# mkdir -p src/services/notifications/strategies

npm run typecheck
npm run lint
npm test
```

plus the OCP sweep (must stay silent):

```sh
grep -rn "switch (\|case '" src/
```

Then add the checklist for the team member:
- [ ] every NEW FILE created with the exact path from the work order
- [ ] every EDIT FILE change applied surgically
- [ ] 3 commands green; sweep silent
- [ ] nothing else in the repo was touched

## 8. When unsure

Ask ONE targeted question (which layer? which existing file content? which
route prefix?) instead of guessing. Never claim something works without the
green output above (the team member pastes it; comments on results
belong on their side).
