# routes/

Versioned HTTP wiring: URL paths, HTTP methods, middleware chains, and controller
calls created **ON the route line**. No business logic, no data access, no
frameworks other than Express.

## Files

- `index.ts` — **THE composition root** (see docs/conventions.md,
  "Composition"). The only file below `app.ts`/`server.ts` allowed to import
  repositories and `config/env`. It builds every repository and service
  exactly once and hands them to the feature routers below. eslint turns its
  dependency rules OFF for this file only.
- `<feature>.routes.ts` — pure wiring. Dependencies are INJECTED (they are
  never built here):

  ```
  export function createAuthRouter(authService: AuthService): Router
  ```

  and every endpoint is a self-contained line — controller factory called at
  attachment point, never a detached variable:

  ```
  router.post('/register', createRegisterController(authService));
  ```

## Route-level request control (Artifex-style)

Everything that must control/correct what comes from the frontend is enforced
directly on the route line — body validation chains, auth guards, role
checks, rate limits:

```
router.get('/getUser', MW.protect, UC.getUserProfile);        // Artifex
router.get('/plans/:planId', requireSession, createGetPlanController(deps));
```

The chain ON the path is the enforcement point; controllers stay thin
translators and do not re-check what a middleware already enforced.

## Dependency rule

`routes -> controllers (+ middleware/config for wiring; services only as
INJECTED arguments and their TYPES from src/types/)`.

routes must NEVER import services' implementations to call them for logic,
repositories, or models — building anything lives in `services/` factories
(wired in `index.ts`).

Exception: `health.routes.ts` is the operational endpoint (`GET /health`); it
wires ONE controller function (`controllers/health.controller.ts`), and that
controller is the ONLY one allowed to touch `config/database` directly —
documented in docs/conventions.md.
