# types/

Pure, cross-layer contract types WITHOUT runtime code. One barrel:
`src/types/index.js`.

## The extraction criterion (strict)

A type goes here ONLY if it is GENUINELY reused by two or more layers
(example: `AuthUser` — every auth/user endpoint echoes it). If a type is
consumed mainly inside one module, it STAYS in that module — importing a
type is not duplication; only REDECLARING one is:

- Service contract shapes are derived AT SOURCE, in each service file:
  ```ts
  export type AuthService = ReturnType<typeof createAuthService>;
  ```
- Feature-local wiring bags (e.g. `GithubAuthDeps`) live next to their
  primary consumer — e.g. in `controllers/github-auth.controller.ts`, where
  the factories that destructure it are declared.
- zod-derived inputs (`RegisterInput`, `LoginInput`) are `z.infer` exports
  of the schema files (`services/auth/*.schema.ts`) — never re-infer them.

Do NOT dump every interface into this folder "for tidiness": an extracted
type nobody reuses is indirection with zero payoff — and it drifts from the
module that produces it.

## Rules

- `type`/`interface` and type-only imports ONLY — nothing here executes.
- Import a type from the barrel when it is one of these shared contracts;
  all other types import from their own module.
