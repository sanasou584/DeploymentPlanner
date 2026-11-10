# Open-Closed Principle (OCP) — coding rule & implementation guide

Target audience: every contributor AND every coding assistant working in this
repository. This document is a **rule**: do not merge code that violates it.

## 1. Definition

> Software entities (modules, functions, services) should be **open for
> extension, but closed for modification**. — Bertrand Meyer, 1988

Concretely: **adding new behavior means adding NEW code, not editing OLD,
tested code.**

Why this repo enforces it:

- **Regression risk scales with edits.** Every new `case` inside a stable
  switch re-risks the branches that already work (and that the team has
  stopped re-reading carefully because "it's done").
- **Merge cost.** A dispatcher edited by every feature is a merge hotspot.
- **Change parity.** A feature PR should be line-dominated by ADDITIONS
  (`git diff --stat` shows mostly `+` outside the registry) — reviewers
  verify what was added, not what might have broken.
- **Tree = feature list.** When each extension owns its file, the file tree
  documents the product.

The principle is already trusted elsewhere in this codebase (verified by a
whole-`src/` sweep, 2026-10-24 — zero findings):

- `middleware/error-status-table.ts` (one row per error class — HTTP
  mapping as data), `defineStateMachine` (`domain/state-machine` —
  transitions as data), zod schemas (validation as data), declared model
  indexes (behavior as data);
- **per-kind rules are ARRAYS, not branches**: `GENERATED_FILE_KINDS` +
  `KINDS_REQUIRING_PLAN` (generated-file model), `PROJECT_ENVIRONMENTS`
  (zod `z.enum` composition). Adding a kind means extending the enum/data
  row — never editing a dispatcher. Single invariants like
  "DOCKERFILE requires analysis/plan" are one stable `if`, not ladders;
- **zero `switch`/`case` statements exist in runtime `src/`** (grep-swept);
  the only two `else if` chains are stable-forever buckets (log severity
  in `request-logging.ts`, body-parse `SyntaxError` in `error-handler.ts`)
  — the "plain `if`" case of the rubric in section 3;
- when a THIRD branch per feature appears in any of those buckets, the
  strategy + registry pattern of section 3 is mandatory.

This sweep is re-verified by reviewers (and AI coding assistants) at every
structural review: the check is mechanical — `grep -rn "switch (\|case '"
src/` must stay empty, and every "same disease" pattern of section 2 counts
its branches per discriminator.

## 2. Bad example (BANNED — growing dispatch chains)

```ts
// BANNED: every new channel edits this union, this function, its callers.
export async function notify(
  channel: 'EMAIL' | 'SLACK' | 'WEBHOOK',
  payload: NotificationPayload,
  config: NotificationConfig,
): Promise<void> {
  switch (channel) {
    case 'EMAIL':
      await sendEmail(config.smtp, payload);
      break;
    case 'SLACK':
      await config.slackBotToken
        ? slackBotPost(config.slackBotToken, payload)
        : slackWebhook(config.slackWebhookUrl, payload);
      break;
    case 'WEBHOOK':
      await postWebhook(config.webhookUrl, payload);
      break;
  }
}
```

Damage per new channel: the union type, the function, the config type, and
every caller are TOUCHED; the whole function must be requalified for all OLD
channels (a typo in the EMAIL `case` ships inside the SLACK feature);
complexity grows linearly with N and breaks our cc ≤ 9 budget
(docs/conventions.md, "Complexity budget").

Same disease in other costumes: stacked `if (kind === 'x') else if (kind
=== 'y')` ladders, feature booleans (`if (config.useAi) ... else if …`),
per-kind DTO mappers growing columns, and functions whose `git blame` is a
"one more `case` per sprint" history.

## 3. Good example (REQUIRED — strategy + registry)

Extension = **new file, one registration line, zero edits** to existing,
tested code.

```ts
// src/types/notification.types.ts — contract (written once, then closed)
export interface NotificationPayload {
  subject: string;
  body: string;
}

export type NotificationStrategy = {
  readonly channel: string;          // discriminator
  readonly defaultPriority: number;
  verify(config: NotificationConfig): void;        // fail fast at BOOT
  send(payload: NotificationPayload): Promise<void>;
};
```

```ts
// services/notifications/strategies/slack.strategy.ts — NEW FILE each time
import type {
  NotificationStrategy,
  NotificationPayload,
} from '../../types/index.js';

export function createSlackStrategy(
  config: NotificationConfig,
): NotificationStrategy {
  return {
    channel: 'SLACK',
    defaultPriority: 5,

    verify(config) {
      if (!config.slackBotToken && !config.slackWebhookUrl) {
        throw new Error('SLACK: bot token or webhook URL required');
      }
    },

    async send(payload) {
      config.slackBotToken
        ? await slackBotPost(config.slackBotToken, payload)
        : await slackWebhook(config.slackWebhookUrl, payload);
    },
  };
}
```

```ts
// services/notifications/registry.ts — written ONCE, then CLOSED forever
import type { NotificationStrategy } from '../../types/index.js';
import { createSlackStrategy } from './strategies/slack.strategy.js';
import { createEmailStrategy } from './strategies/email.strategy.js';

export function createNotificationRegistry(config: NotificationConfig) {
  const strategies = new Map<string, NotificationStrategy>();

  function register(creator: () => NotificationStrategy): void {
    const strategy = creator();

    if (strategies.has(strategy.channel)) {
      throw new Error(
        `Duplicate notification channel: ${strategy.channel}`,
      );
    }

    strategy.verify(config);       // boot-time validation per strategy
    strategies.set(strategy.channel, strategy);
  }

  register(() => createSlackStrategy(config));   // 1 line per strategy
  register(() => createEmailStrategy(config));

  return {
    async send(
      channel: string,
      payload: NotificationPayload,
    ): Promise<void> {
      const strategy = strategies.get(channel);

      if (!strategy) {
        throw new UnknownChannelError(channel);  // domain error, loud
      }

      return strategy.send(payload);
    },
  };
}
```

House-shape alignment:

- strategies live in their own files (tree = feature list);
- the registry owns ONE `switch`-replacement dispatch; callers never branch
  again on the discriminator themselves;
- the factory is a functional factory — dependencies arrive injected, never
  read `config/` (services README);
- the contract type is in `src/types/` only if genuinely reused across
  layers (types criterion);
- fan-out (`await Promise.all(...)`) composes strategies instead of adding a
  meta-case.

### When NOT to pay the ceremony (important!)

| Situation | Correct tool |
|---|---|
| 2 branches, stable forever | plain `if` — a strategy is over-engineering |
| Data-like mapping (status → next statuses) | data table / `defineStateMachine` |
| 3rd branch, or 2 branches that change per release, or independently combinable behaviors | strategy + registry |

Never invert: an interface hierarchy for two frozen branches is WORSE than a
two-line `if`. OCP is a growth-direction rule, not a decoration rule.

### OCP-specific failure mode (defense)

Strategy dispatch is *invisible* to callers, so it must **fail loud**:

- every strategy self-validates via `verify` and the registry runs it at
  composition time (boot) — configuration mistakes die at startup, not in a
  production half-request;
- unknown discriminator keys throw a domain error
  (`UnknownChannelError`), never fall through silently;
- duplicate registrations throw (two strategies claiming one channel).

## 4. Checklist (enforce at review)

- [ ] Any function reaching a THIRD `case`/branch per feature must be
      replaced by strategy + registry **before** the code settles.
- [ ] A feature PR = new file(s) + one registration line; NO edits inside
      existing strategies, the dispatcher, or the contract
      (`git diff --stat` check: additions only outside the registry).
- [ ] Discriminator dispatch happens ONCE, in the registry/factory — callers
      must not re-branch after calling it.
- [ ] Registry fails loud: `verify` at composition time; unknown key →
      domain error; duplicate registration → error.
- [ ] One contract type, placed per the types criterion; one file per
      strategy; registration centralized (composition root style).
- [ ] No per-strategy config reads or singletons: deps injected.
- [ ] Tests change by ADDITION only: new strategy ships its own spec;
      existing strategy suites must not need edits. If adding a feature
      touches an existing test's LOGIC, the dispatcher is not OCP yet.

See also: docs/conventions.md ("Dependency direction", "Types & contracts",
"Composition", "Complexity budget", "Async contract", "Zod rules").
