import { InvalidStateTransitionError } from '../errors/index.js';

/**
 * Pure, reusable state machine. No Mongoose, no framework - models instantiate
 * one per status field and assert transitions inside behavior methods.
 * Staying on the current state (from === to) is NOT an allowed transition:
 * use the model's intention-revealing method again or treat it as an error.
 */

export interface StateMachine<S extends string> {
  canTransition(from: S, to: S): boolean;
  assertTransition(from: S, to: S): void;
}

export function defineStateMachine<S extends string>(
  transitions: Readonly<Record<S, readonly S[]>>,
): StateMachine<S> {
  const canTransition = (from: S, to: S): boolean => (transitions[from] ?? []).includes(to);

  return {
    canTransition,
    assertTransition(from, to): void {
      if (!canTransition(from, to)) {
        throw new InvalidStateTransitionError(from, to);
      }
    },
  };
}
