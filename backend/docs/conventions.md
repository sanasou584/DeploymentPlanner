# Conventions — DeploymentPlanner AI backend

## Folder rules

```
src/
  config/          env contract (zod, fail fast), database connection
  domain/          framework-free primitives: enums/, errors/, value-objects/,
                   state-machine/
  models/
    entities/      exactly one file per Mongoose model + barrel index.ts
    value-objects/ shared embedded subschemas (one file per VO)
    plugins/       shared schema plugins (soft-delete, base schema options/serde)
  repositories/    one file per repository + barrel; BaseRepository lives here
  services/        orchestration: cross-document rules, transactions, audit
  controllers/     HTTP layer: parse/validate input, call services, map to DTOs
  routes/          Express routing per resource + per-feature composition
                   (builds services/controllers, declares paths)
  middleware/      request logging, 404, central error handler + status table
  shared/          crypto/, logging/, security/ (multi-layer helpers)
tests/
  unit/            pure rules (no DB): models, value-objects, domain, shared
  models/          integration specs per model (mongodb-memory-server)
  repositories/    integration specs per repository
  http/            supertest specs on the Express app
docs/              domain-model.md, conventions.md
```

## Dependency direction (enforced by ESLint rules, see `eslint.config.js`)

```
routes → controllers → services → repositories → models/entities
                                              → models/plugins, value-objects
domain/*      everything may import domain; domain imports NOTHING app-side
shared/*      importable by all layers; shared imports domain only
```

Forbidden: models importing repositories/services; repositories importing
services/controllers; `src/config/env` beyond the composition roots
(`server.ts`, `app.ts`, `routes/index.ts`, standalone scripts in
`src/scripts/`, test helpers) — `config/database.ts` never resolves env
itself, callers pass the URI and the autoIndex decision; `app.ts` importing
anything below `routes/` except `routes/index.ts`; locally redeclaring a
type that already exists in `src/types/` (see "Types & contracts").

**Auth guards are the ONE middleware exception to "middleware calls
services"**: `middleware/require-auth.ts` needs the session verifier and
the user service, so instead of importing services it consumes their
CONTRACT TYPES ONLY (`src/types/index.js`), injected via its factory
`createRequireAuth(sessions, users)` from the composition root. Never
import a service implementation file from `middleware/`.

## Types & contracts — extraction criterion (strict)

Types are centralized ONLY when they are genuinely reused across layers.
Importing a type is NOT duplication — only REDECLARING one is. So:

```
src/types/          pure types reused by 2+ layers ONLY (nothing executes)
  auth.types.ts     AuthUser (every auth/user endpoint echoes it — sure reuse)
  github.types.ts   GithubProfile (OAuth service produces it, auth service consumes it)
  index.ts          barrel ('src/types/index.js')
```

- **Module-local shapes NEVER move here.** Each service derives its own
  contract at source, zero duplication, zero drift:
  ```ts
  export type AuthService = ReturnType<typeof createAuthService>;
  export type SessionTokenService = ReturnType<typeof createSessionTokenService>;
  ```
- **Feature-local wiring bags** (e.g. `GithubAuthDeps`) live next to their
  primary consumer (the controller file whose factories take it).
- **zod-derived inputs** (`RegisterInput`, `LoginInput`) are `z.infer`
  exports of the schema files (`services/auth/*.schema.ts`) — their only
  source; never re-infer them by hand.
- NEVER copy/redeclare a type in a second file — import it from wherever
  lives its single source (the barrel above or the owning module).
- `src/types/` stays type-only (zod-inferred types are the sanctioned
  exception). Extracting a type nobody reuses is indirection with zero
  payoff — don't.

## Composition (who builds what) — enforced like the dependency direction

The reference pattern (Artifex backend): `app.js` imports ONLY routes
(`app.use("/api/user", user)`). Applied here, in three levels:

1. **`app.ts`** is the GLOBAL bootstrap: express app, global middleware
   (logging, helmet, cors, json, cookies), the 404/error handlers, ONE
   mounted router (`app.use('/api/v1', createApiRouter())`), health and
   swagger. It must NEVER import services, repositories or controllers.
2. **`routes/index.ts` is THE composition root** (the ONLY file below
   `app.ts/server.ts` allowed to import repositories and call `getEnv()` —
   eslint turns every other rule off JUST for this file):
   - it builds EVERY repository here (`new UserRepository()` …), once;
   - it builds every service via the functional factories;
   - it calls each feature router factory, passing the dependencies as
     arguments (`createAuthRouter(authService)`, `createGithubAuthRouter(deps)`).
3. **`routes/<feature>.routes.ts`** is pure HTTP wiring: NO dependency is
   built there. Controllers are created **ON the route line**:
   ```
   router.post('/register', createRegisterController(authService));
   router.post('/login', createLoginController(authService));
   ```
   Never a detached variable then re-attach — one line per endpoint.
   **Incoming-request control (validation, guards, per-route middleware)
   is expressed directly on that same route line**, Artifex-style:
   `router.get('/getUser', MW.protect, UC.getUserProfile)`. That chain is
   where things coming from the frontend are enforced — controllers stay
   thin. Routes still contain NO business logic and NO data access.
4. **Services are FUNCTIONAL factories, not classes** (no `class`, no
   `this`, no DI-container vibe):
   ```
   export function createAuthService(
     users: UserRepository = new UserRepository(),
   ): AuthService { ... return { register, login }; }
   ```
   The dependency arrives as a PARAMETER and default-wires itself, so:
   `routes/index.ts` passes repositories explicitly (`createAuthService(users)`)
   while tests wrap fakes with zero ceremony. Services never read
   `config/` — env values arrive as arguments.
5. **Controllers** are factories taking their deps (`AuthService` from its
   service file, `GithubAuthDeps` declared in its own controller file) and
   returning `RequestHandler`s — every type has ONE source (see "Types &
   contracts" for what belongs in `src/types/` vs. its own module) and
   controllers stay `config/`-free.

Operational exception (`GET /health`): must respond even when the rest of the
app is broken, so it bypasses services. The route wires
`controllers/health.controller.ts#wireHealth` and INJECTS the `getDbStatus`
getter (routes -> config is legal; controllers keep zero config imports).
This is the only endpoint allowed to skip the services layer.

## How to add a model

1. **Enums first**: add every closed set (`STATUSES`, ruled vocabularies) to
   `src/domain/enums/<name>.enums.ts` — models import enums, never inline
   string literals in fields.
2. **One file** `src/models/entities/<name>.model.ts`:
   - export `XxxFields` (no Mongoose types), `XxxMethods`, `XxxStatics`
     optionally `XxxVirtuals`, and the combined `XxxDocument =
     HydratedDocument<XxxFields, XxxMethods & XxxVirtuals>`.
   - schema generic order:
     `new Schema<Fields, BaseModel, Methods, Record<never, never>, Virtuals-or-Record<never, never>, Statics, DefaultSchemaOptions>`.
   - build models via `mongoose.model(NAME, schema)` (the named `model` export
     has no schema-inference overload); export `XXX_MODEL_NAME` for services.
   - invariants are behavior methods or `pre('validate')` hooks; never bare
     validators for cross-field rules. Embedded-VO invariants MUST guard with
     "skip when the value isn't parseable yet" (hooks run before field
     validators) and each shared subschema factory must be instantiated once
     per path.
   - use `baseSchemaOptions()` (serde: `_id`→`id`, no `__v`; timestamps).
3. **Register in the barrel** `src/models/entities/index.ts`.
4. **Tests** (`tests/models/<name>.spec.ts`): pure rules via
   `await doc.validate()` (see "Testing approach"), transitions via behavior
   methods, uniqueness/index/soft-delete behaviour against
   `connectTestingModule('<name>_test')`. Purge between tests with
   `deleteMany({}).setOptions({ withDeleted: true })` (append-only models:
   driver-level `collection.deleteMany`).
 5. Run `npm run build && npm run typecheck && npm run lint && npm test`.

## Open-Closed Principle (OCP) — enforced rule

**Extension adds files and registration lines; it never edits working,
tested code.** Full rule, bad/good examples and the review checklist live in
`docs/ocp.md` — read it before touching any dispatch code.

- Any function reaching a THIRD per-feature `case`/branch must become a
  strategy + registry (with boot-time `verify` and an unknown-key domain
  error) before the code settles.
- A feature PR is line-dominated by ADDITIONS: new file(s) + one
  registration line; zero edits inside existing strategies/dispatchers.
- Dispatch happens ONCE in the registry — callers never re-branch on the
  discriminator; unknown keys throw, never fall through.
- 2 stable branches stay a plain `if`: a strategy there is over-engineering
  (see the rubric in `docs/ocp.md`).

## Shared helpers (validation & parsing)

- `src/shared/validation/request-validation.ts` is THE single home for:
  - **`hexIdSchema`** — the 24-hex-char Mongo ObjectId regex shared by every
    entity id schema (users, projects...). Layer schemas COMPOSE it
    (`z.object({ id: hexIdSchema })`); re-declaring the regex anywhere is a
    rule violation (same for any duplicated schema).
  - **`parseOrThrow(schema, value, message?)`** — THE controller parse path:
    `safeParse`, on failure throws
    `AppError('VALIDATION_ERROR', message, z.flattenError(...))`.
    Inline `safeParse` + `AppError` blocks inside controller factories are
    BANNED — call `parseOrThrow` with a precise message.
- **One model method per mutation, ONE save per request mutation**:
  multi-field updates go through a single `applyUpdate`-style method (each
  `save()` re-opens the window for unique-index races), never one save per
  field inside services.

## Complexity budget (CodeScene "Complex Method", cc ≤ 9)

A function or method that mixes its STEPS with all their branching goes over
the complexity budget fast (cc = 10 flags it red). The fix is always the
same: extract each step into a small named function and keep the orchestrator
a flat sequence of steps. Example: `getProfile` reads
`exchangeCodeForToken → fetchProfileAndEmails → verifiedPrimaryEmail` —
`fetchGithubJson` centralizes the single "response.ok branch" so no caller
re-branches on it. A step function does ONE thing; a flow function does NO
branching it can delegate.

## Indexes

- **Declare indexes in the schema files** (field/index options), never call
  `collection.createIndex` ad hoc; models expose them via `diffIndexes()`.
- **`autoIndex` is disabled in production.** Run
  `npm run db:sync-indexes -- --apply` on every deploy — it diffs each model's
  declared indexes against the database and creates/drops the difference
  (dry-run by default; exits non-zero on failure).
- Unique/partial indexes (users.email unique, projects `(owner,name)` partial
  unique, deployment-plans `(project,version)` unique) only exist if the sync
  script ran against that database — CI and local dev should run `--apply`
  after migrations.

## How to write a state machine

- Instantiate ONE `defineStateMachine<Status>({ STATE: ['NEXT1', 'NEXT2'], ... })`
  per status field at module scope.
- Status flags are enum values from `domain/enums`; a status field is
  `required: true` with the enum list.
- Behavior methods (not services, not controllers) assert + mutate:
  ```
  MACHINE.assertTransition(current, next);   // throws InvalidStateTransitionError
  this.set('status', next);
  ...
  return this.save();
  ```
- Resting on the current state (`from === to`) is NOT a valid transition.
- The single transition error message contract:
  `Invalid state transition: cannot move from "X" to "Y"`.

## Async contract (async/await ONLY — no promise chains)

- **Every async code path is written `async`/`await`** — `.then(...)` and
  `.catch((caught) => caught)` chains are BANNED in `src/` AND `tests/`
  (grep is the enforcement: `\.then(|\.catch(|new Promise` must return
  nothing but the callback URL constants and `timers/promises` imports).
- When a test needs a THROWN error as a value, use an awaited block with an
  explicit `try/catch` (see `tests/helpers/schema-validation.ts`); when a
  flow must not crash the process, wrap it in one awaited bootstrap with a
  single `try/catch` (see `src/server.ts`, `src/scripts/*.ts`).
- Plain sleeps in tests use the platform primitive:
  `import { setTimeout as sleep } from 'node:timers/promises'; await sleep(10);`
  — never `new Promise((resolve) => setTimeout(resolve, ms))`.
- `await Promise.all([...])` stays (it IS async/await-friendly) for
  independent parallel work.
- Model/service functions rely on awaits only — behaviors never use
  callbacks or `.then` — so bugs surface as rejected promise rejections at
  ONE awaited boundary (controller → central error handler).

## Error handling contract

- One family: `domain/errors` (`AppError` base + domain classes). Every class
  carries a stable `code` (e.g. `INVARIANT_VIOLATION`).
- Models/repositories **throw**; services decide transactional rollback;
  controllers never catch domain errors — the central `error-handler`
  middleware resolves the HTTP status from `middleware/error-status-table.ts`
  (ONE table; adding an error class = one row) and logs via `shared/logging`.
- Unknown errors become 500 `INTERNAL_ERROR`, never leaking stack traces.
- No `try/catch` inside models that swallows errors; `assert*` helpers throw.

## Testing approach

- Unit (`tests/unit`): pure invariants with `await doc.validate().catch(e => e)`
  wrapped by the shared helper (`tests/helpers/schema-validation.ts` captures
  the rejected `ValidationError.path` keys); NO database.
- **`doc.validateSync` is BANNED** (ESLint `no-restricted-properties` on src
  and tests): it is deprecated for removal in Mongoose 10, and it SKIPS
  sub-document `pre('validate')` hooks, so validation outcomes differ from
  production.
- Model integration (`tests/models`): `mongodb-memory-server` through
  `connectTestingModule`/`disconnectTestingModule` (unique db name per file);
  `await Model.init()` in `beforeAll`; purge collections in `beforeEach`.
- Repository integration (`tests/repositories`): same helpers; ordering tests
  insert with small delays when sorted by `createdAt` (millisecond resolution).
- `tsconfig.typecheck.json` covers `src/` AND all of `tests/` — every spec file
  must compile under the same strict flags (`npm run typecheck`).
- Service tests that exercise transactions need a replica set:
  `mongodb-memory-server` must run as `MongoMemoryReplSet` (single-node), since
  standalone memory servers reject `startTransaction`.
- HTTP (`tests/http`): supertest on the compiled `app` (no `listen`);
  env vars mocked/fake as needed.
## Transactions

- `BaseRepository`'s `{ session }` plumbing exists, but MongoDB transactions
  REQUIRE a replica set (Atlas out of the box, or a local single-node replica
  set: `mongod --replSet rs0` + `rs.initiate()` once). The dev/test cluster
  used by default (standalone) REJECTS `startSession/startTransaction`.
- Services open sessions, pass them down via `{ session }` and commit/abort —
  repositories stay untouched.

## API conventions

- **Prefix**: every route lives under `/api/v1`; version bump only for
  breaking changes.
- **Route order is part of the API contract**: Express matches in mount
  order — a router mounting `/users/:id` SWALLOWS `/users/pending` unless
  the literal path is mounted FIRST. When two feature routers share a
  prefix, gate literals before parameters, and note the order requirement
  in the composition root (`routes/index.ts`).
- **Resources are plural nouns**: `projects`, `deployment-plans`, `forks`,
  `runs`. No verbs at the collection root (`/plans/create` is banned).
- **Reads are ALWAYS `GET`** — even "expensive" ones like analyses (a read
  with side effects such as caching stays `GET`).
- **Filters, sorting, pagination go in the query string**: `/plans?filter[state]=DRAFT&page=2&pageSize=25`
  (error and pagination bodies reuse the error/pagination envelopes already
  defined by the middleware contracts).
- **Non-CRUD actions are `POST` on a sub-path of the resource**:
  `POST /api/v1/projects/:id/approve` — never `PUT /approve` on a collection
  root; the sub-path reuses the ERROR/ownership middleware chain.
- **Ownership is resolved through the parent**: user-scoped entities are
  always nested under `/users/:id/...` or the parent project:
  `/api/v1/projects/:id/plans/:planId`; services verify the link instead of
  trusting the caller's user id.
- **Admin routes live under `/admin`** with an explicit role assertion
  middleware (`requireRole('ADMIN')`); the claim is NOT trusted from the body
  or a bare cookie.
- **Auth middleware reloads the user on every request** and then calls
  `user.assertCanAuthenticate()` (a deactivated/deleted user's tokens are
  rejected even if the record was cached earlier), instead of reading a
  trusted-user row from an earlier middleware snapshot.
- **Serde contract**: request bodies are plain JSON (camelCase), error and
  pagination envelopes as documented in `middleware/error-handler.ts` and the
  pagination helper — adding a route never invents a fourth envelope shape.

## Zod rules (v4 — deprecated APIs banned, enforced by ESLint `no-restricted-properties`)

The project runs zod 4. The migration-era shims are deprecated here — use
the v4-native functions:

| BANNED (eslint error) | Use instead |
|---|---|
| `result.error.flatten()` | `z.flattenError(result.error)` |
| `result.error.format()` | `z.treeifyError(result.error)` |
| `z.object({...}).strict()` | `z.strictObject({...})` |
| `z.object({...}).nonstrict()` | `z.looseObject({...})` |

`VALIDATION_ERROR` payloads keep the same flattening shape —
`z.flattenError()` returns the identical structure (the envelope contract
above is unaffected). Keep zod usage central: schemas live in
`services/<feature>/*.schema.ts`, request validation only in controllers,
and env parsing only in `config/env.ts`.
