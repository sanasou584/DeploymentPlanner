# DeploymentPlanner AI — frontend

Next.js 16 (App Router, Turbopack) + Tailwind CSS v4 + TypeScript strict.

## Architecture

Authored rules live in `skills/frontend-rules/SKILL.md` — mandatory reading
for any AI/model working here (enforced via the repo `AGENTS.md` files).

```
src/
  app/         routing shell only (layout, pages, tokens in globals.css)
  components/  composed feature views    auth/ , layout/
  shared/      design-system atoms       button, pill, text-field, icons, strength meter, …
  hooks/       client stateful logic     use-password-visibility
  data/        static content records    brand, fonts, navigation, footer, pipeline, signup-steps, capabilities
  utils/       pure functions            class-names (cn), validators, password-strength
  types/       closed type unions        auth, navigation, pill, pipeline, signup-steps, icons
  tests/       vitest specs mirroring src/
```

Dependency direction: `app → components → shared`; every layer may use
`utils/`, `data/` (except shared), and `types/`. Colors/fonts come only from
design tokens in `src/app/globals.css` (`@theme`).

Key seams:
- Routes: `/` renders the landing page, `/login` and `/signup` the auth
  pages. All cross-link through `AUTH_PAGE_PROMPTS`, `LANDING_HEADER_CTAS`,
  and other `data/` route rows.
- `data/landing*`, `data/hero.ts`, `data/features.ts`, `data/workflow.ts`,
  `data/ai-plan.ts`, `data/tech-strip.ts`, `data/cta-banner.ts` feed the
  landing page; animation leaves import only `motion/react`.
- `LoginForm` / `SignupForm` take an optional `onSubmit(values)` prop —
  wire the backend auth calls there without touching form internals.
- Content rows (nav links, pipeline steps, signup steps, pills) live in
  `src/data/`; adding an item is one data row, never a JSX copy.

## Commands

```bash
npm run dev        # turbopack dev server
npm run build      # production build (required when app/components/shared change)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint (zero errors + zero new warnings)
npm test           # vitest run
```

All four gates must pass before any change is considered done.

## Fonts

`Plus Jakarta Sans` (interface) and `JetBrains Mono` (telemetry/code) are
self-hosted via `next/font` in `src/data/fonts.ts`. Material Symbols
Outlined loads once from Google Fonts in the root layout; usage goes
through `@/shared/material-icon`.
