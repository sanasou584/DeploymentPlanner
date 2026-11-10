# AGENTS.md — DeploymentPlanner AI frontend

**This file is read automatically by agentic tools (opencode, Codex, Cursor, Cline, …).**

## MANDATORY FIRST ACTION — before ANY code, feature, bugfix, refactor or review

1. Load and follow the installed agent skill **`frontend-rules`**
   (canonical file: `skills/frontend-rules/SKILL.md` relative to this
   directory). It is the pre-work checklist: folder contract, token-only
   styling, server-first components, data-table rendering, and the
   verification gates (`typecheck` + `lint` + `tests` + `build`).
2. If the skill is not installed in your tool, READ the canonical file
   directly at `skills/frontend-rules/SKILL.md` (added by `install`) and
   follow it to the letter.

Rules are the team's contract: they outrank the features requested. Silent
rule violations are merge-blockers, not style opinions.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
