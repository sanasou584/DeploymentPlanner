# AGENTS.md — DeploymentPlanner AI

**This file is read automatically by agentic tools (opencode, Codex, Cursor,
Cline, …). Claude models: see `CLAUDE.md` next to it — same directive.**

## MANDATORY FIRST ACTION — before ANY code, feature, bugfix, refactor or review

1. Load and follow the installed agent skill for the layer you are working
   in:
   - **Backend** → skill **`backend-rules`** (canonical file:
     `backend/skills/backend-rules/SKILL.md`), the pre-work checklist: it
     makes you read EVERY rules file first, apply `docs/ocp.md`
     (Open-Closed Principle verified sweep), write clean code per
     `docs/conventions.md`, and prove it with `typecheck` + `lint` +
     `tests` before claiming done.
   - **Frontend** → skill **`frontend-rules`** (canonical file:
     `frontend/skills/frontend-rules/SKILL.md`), the pre-work checklist:
     folder contract (`app/components/shared/hooks/data/utils/types/tests`),
     token-only styling, server-first components, data-table rendering,
     and verification gates `typecheck` + `lint` + `tests` + `build`.
2. If the skill is not installed in your tool, READ the canonical file
   directly at the given path and follow it to the letter.

Rules are the team's contract: they outrank the features requested. Silent
rule violations are merge-blockers, not style opinions.
