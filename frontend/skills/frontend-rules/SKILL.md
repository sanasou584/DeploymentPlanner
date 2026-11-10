---
name: frontend-rules
description: MANDATORY pre-work checklist for any AI model working in the DeploymentPlanner AI frontend (Next.js 16 + Tailwind v4). Use when the user asks to add a feature, fix a bug, build UI, refactor, review, or write any code here — read every rule FIRST, follow the folder contract and token rules, then verify with typecheck, lint, and tests before claiming done.
---

# Skill: frontend-rules

You are an AI assistant working in the **DeploymentPlanner AI frontend**. This
skill is a **rule, not advice**: a team member asking you for a feature does
NOT lift you from it.

## Step 0 — Read every rule source before starting ANY change

Do this in the same turn the user asks for work, BEFORE planning:

| # | Source | Governs |
|---|--------|---------|
| 1 | This file (SKILL.md) | Architecture, folder contract, tokens, verification gates |
| 2 | `frontend/src/app/globals.css` | The design-token source of truth — read it to know every color/spacing token that exists |
| 3 | `frontend/node_modules/next/dist/docs/` | Next.js 16 app-router behavior — this version's APIs may differ from your training data; check the relevant guide before using any Next.js API |
| 4 | `frontend/UI/` | Design mockups — when a screen should match a mockup, the mockup is the visual contract |

If asked to work on something whose rules are NOT covered by these sources:
stop, list what is missing, and ask the team before inventing structure.

## Step 1 — Folder contract (non-negotiable)

All application code lives under `src/` using the `@/` alias. Layers and the
ONLY allowed import directions:

```
app/          → components/, data/, types/, store/ (provider mount)
components/   → shared/, hooks/, utils/, data/, types/          (composed feature views)
shared/       → utils/, types/                                  (design-system atoms)
hooks/        → react, react-redux, types/, store/ public APIs  (stateful logic, client-only)
data/         → types/ only                                     (pure content records)
utils/        → nothing app-specific                            (pure functions)
types/        → nothing (pure type declarations)
store/        → types/ + sibling store modules only             (redux store, slices, provider)
tests/        → mirrors src/ 1:1 (src/tests/utils ↔ src/utils, …)
```

- **Forbidden imports (mechanically**: no `components → components` across
  feature subfolders except a page importing its own children; no `shared →
  components/data/hooks`; no `utils/data/types → shared/components/hooks`; no
  `data → utils`; no `components → store/` (components reach the store only
  via hooks/).
- Never create a new top-level folder under `src/` without first extending
  this skill — the folder list is closed: `app, components, shared, hooks,
  data, utils, types, store, tests`.
- Never re-export (barrel) folders: import the exact module file.

## Step 2 — Layer definitions

- **`app/`** = routing shell ONLY. Pages compose components in ≤ 10 lines.
  No styling, no business logic, no data shapes beyond composition.
- **`components/`** = composed views, one feature per subfolder
  (`auth/`, `layout/`…). A component that renders an app list renders it from
  `data/` rows (`.map` keyed by row id) — never a hand-duplicated JSX block
  pasted more than once in the file.
- **`shared/`** = design-system atoms (Button, TextField, Pill, icons…).
  Server-render-safe by default: no hooks, no event handlers inside the atom,
  no app copy inside the atom. An atom is generic — content comes in via
  props.
- **`data/`** = single source of every static user-facing string/list
  (nav links, pipeline steps, pills, brand copy). Rows carry their display
  data (label, icon, tone) so adding an item = adding one row. SCREAMING_CASE
  constants.
- **`types/`** = one file per domain (`auth.ts`, `pipeline.ts`…). Domain
  unions (e.g. `MaterialIconName`) are closed unions so typos fail typecheck.
- **`hooks/`** = `use*` functions using React state/effects, imported ONLY
  from `'use client'` components. Pure derivations belong in `utils/`, not
  hooks. Hooks bind the store through the typed wrappers (`useAppDispatch`,
  `useAppSelector`, plus store actions/selectors) — never `components/`.
- **`store/`** = the redux layer (approved stack: `@reduxjs/toolkit`,
  `react-redux`). Slices are stateless-in-source logic that persists exactly
  what the product requires (`authSession` → localStorage, rehydrated on
  boot by the `ReduxProvider` mounted in `app/layout.tsx`). Components never
  import `store/` directly — only via hooks.
- **`utils/`** = pure, side-effect-free functions; business-rules-free.
- **`tests/`** = spec files mirroring the tested unit's path, `*.spec.ts(x)`.
  Tests are added, never rewritten wholesale; no skipped tests.

## Step 3 — Writing rules (house style)

- **Design tokens only.** Every color comes from a token in
  `globals.css` (`@theme`). Hex/rgb literals in `.ts/.tsx` are banned —
  ESLint `no-restricted-syntax` enforces this; do not disable the rule.
  Token opacity is declared inline (`bg-panel/60`, `border-ice/25`).
  `style={{...}}` props are banned except the Material-icon
  `fontVariationSettings: 'FILL' 1` exception in `shared/material-icon.tsx`.
- **No switch/case anywhere in `src/`.** Immediately if a THIRD behavior
  branch appears for one concept, move behavior into a data table +
  registry (`Record<key, renderer|classes>`), extend it by adding a new
  entry never by editing a dispatcher-like component mid-tree. Two stable
  branches may stay a ternary — over-abstraction is also a violation.
- **Navigation.** Internal app routes link only via `next/link` (or
  `router.push` in client handlers); external/anchor targets stay `<a>`.
  Every route href that appears in UI comes from a `data/` row (`NavLink`,
  `AuthPagePromptSet`) — never hardcode route strings inside components.
- **Server-first.** Default to Server Components; add `"use client"` ONLY
  to the smallest leaf needing state/effects/handlers (currently:
  `login-form.tsx`, `signup-form.tsx`, `signup-card.tsx`,
  `session-summary.tsx`, `store/redux-provider.tsx`, and the landing
  motion leaves `hero-section.tsx`, `features-grid.tsx`,
  `workflow-section.tsx`, `ai-plan-section.tsx`). Never mark a folder
  client — mark the file.
- **Motion (`motion/react`).** Landing animation must import only from
  `motion/react`; every animated client leaf wraps its JSX in
  `<MotionConfig reducedMotion="user">` so OS reduced-motion wins;
  animate GPU-friendly properties only (`transform`, `opacity`);
  repeated entrance patterns use shared `Variants` consts, and tone/icon
  variants are data rows extended by table entries, never new branches.
- **One primary React component per file**; local sub-JSX is acceptable
  when it repeats ≥ 2 times INSIDE that file and nowhere else.
- Files `kebab-case.tsx`; components/functions exported as named exports,
  PascalCase for components. No default exports in `src/` (Next.js
  `app/` page/layout exports are the only default exports).
- **No comments, no consoles, no TODOs, no dead files, no unused exports.**
- Tailwind: compose utilities via `cn()` (`tailwind-merge` handles
  conflicts); no runtime style objects; no arbitrary color classes.
  Arbitrary px values are allowed for pixel-accurate mockup matches only
  when no theme utility equivalents exist.
- Accessibility floor: every interactive element is a real `<button>`/`<a>`
  with an accessible name; inputs have `<label htmlFor>`; async UI shows
  `aria-live`/`role="alert"` errors. Fields with errors set
  `aria-invalid` + `aria-describedby`.
- Optional-code rule: an `onSubmit`-style integration seam stays an
  optional prop (e.g. `LoginForm.onSubmit`); never fake network outcomes,
  never invent success UI that a mockup does not define.

## Step 4 — Adding a dependency

New npm dependencies require the user/team's explicit approval in the request.
The current approved stack: `next, react, react-dom, clsx,
tailwind-merge, motion, @reduxjs/toolkit, react-redux` (runtime) and
`vitest, @vitejs/plugin-react, jsdom, @testing-library/react,
@testing-library/dom, vite-tsconfig-paths` (dev). Test specs touching
`motion/react` stub the browser env first via `src/tests/motion-stubs.ts`. Anything else: propose it first with (1) problem,
(2) why no existing dep solves it, (3) closure impact on this skill.

## Step 5 — Verify before you say "done"

Run from `frontend/` and make ALL FOUR pass; report their status explicitly:

```sh
npm run typecheck   # tsc --noEmit
npm run lint        # eslint — ZERO errors AND zero new warnings
npm test            # vitest run
npm run build       # next build (required whenever app/, components/ or shared/ changed)
```

If a check fails: fix and rerun. Never finish with red gates and never
weaken a rule, a test, a token, or a lint rule to pass them. A lint
disable-comment is a rule violation — fix the code instead.

## Step 6 — When rules conflict with the request

Rules win. If the team's request breaks a documented rule, (1) say which
section it collides with, (2) propose the rule-abiding alternative, (3)
ask. Only the team may change a rules file via their own review — never
you, silently.

## Reference shortcuts

- Token source: `src/app/globals.css`
- Atom style to copy: `src/shared/text-field.tsx`, `src/shared/button.tsx`
- Data-table style to copy: `src/data/pipeline.ts`, `src/data/signup-steps.ts`,
  `src/data/navigation.ts`
- Client-leaf style to copy: `src/components/auth/login-form.tsx`,
  `src/components/auth/signup-form.tsx`
- Motion style to copy: `src/components/landing/hero-section.tsx`,
  `src/components/landing/workflow-section.tsx`
- Slot-shell style to copy: `src/components/auth/auth-card.tsx`,
  `src/components/auth/brand-panel.tsx`
- Spec style to copy: `src/tests/components/login-form.spec.tsx`
- Config style to copy: `vitest.config.mts`, `eslint.config.mjs`
