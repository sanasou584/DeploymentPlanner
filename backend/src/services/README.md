# services/

Orchestration and cross-document rules. This is where transactions belong
(they require a MongoDB replica set, see docs/conventions.md). Services call
repositories, enforce business rules that span more than one document, and
never know about HTTP.

## Pattern: functional factories (no classes, no `this`)

Every service is ONE exported factory returning a plain object of closures:

```ts
export function createAuthService(
  users: UserRepository = new UserRepository(),   // default = self-wiring
): AuthService {
  async function register(input: RegisterInput): Promise<AuthUser> { ... }
  async function login(input: LoginInput): Promise<AuthUser> { ... }
  return { register, login };
}
```

- Dependencies are PARAMETERS (never read `config/` — env values arrive as
  arguments, e.g. `createSessionTokenService(env.sessionSecret)`).
- The default parameter values make each factory zero-argument-callable
  (self-wiring), used by tests and by anyone who has no repository at hand.
- The composition root (`routes/index.ts`) passes repositories explicitly —
  that is the single place where `new UserRepository()` may be repeated.

## Types

Service contract types are DERIVED AT SOURCE, right next to the factory:

```ts
export type AuthService = ReturnType<typeof createAuthService>;
```

Only GENUINELY reused DTO shapes (e.g. `AuthUser`, `GithubProfile`) move to
`src/types/` and get imported from its barrel — the extraction criterion
and the rule "importing a type is not duplication, redeclaring one is" are
in docs/conventions.md ("Types & contracts"). Input types such as
`RegisterInput`/`LoginInput` stay `z.infer` exports of the schemas in this
folder — their only source.

Before adding a growing `switch`/`if` chain here, read the OCP rule:
`docs/ocp.md` — extension adds strategy files + one register() line, never
edits the dispatcher.

Dependency rule: `services -> repositories + models + domain + shared +
types`. services must NEVER import controllers, routes, middleware or
`config/`.
