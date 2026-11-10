# controllers/

HTTP translation only: pull request params/body, call services (via the
injected contract), wrap the result in an Http response (or let domain errors
propagate to the central error handler). No business rules, no Mongoose
queries, no transactions.

## Pattern

Controllers are exported FACTORIES taking their dependencies (service
contracts, dependency bags) as parameters and returning `RequestHandler`s:

```ts
export function createRegisterController(authService: AuthService): RequestHandler
export function createGithubStartController(deps: GithubAuthDeps): RequestHandler
```

- Routes call the factory directly ON the route line —
  `router.post('/register', createRegisterController(authService))` — so no
  controller instance is pre-built or detached (see src/routes/README.md).
- Every type has ONE source and is imported, never redeclared: service
  contracts come from their service file (`ReturnType` derivation),
  feature-local deps bags (e.g. `GithubAuthDeps`) are declared in the
  controller file whose factories consume them, and only GENUINELY reused
  DTO shapes (`AuthUser`…) live in `src/types/` — criterion in
  docs/conventions.md ("Types & contracts").
- Validation of request bodies uses the zod schemas in
  `services/<feature>/*.schema.ts`.
- Controllers stay `config/`-free: any env-derived value (e.g.
  `frontendUrl`, `secureCookies`) arrives inside the deps/arguments.

Dependency rule: `controllers -> services (+ domain, shared, types)`.
controllers must NEVER import repositories or models directly.
