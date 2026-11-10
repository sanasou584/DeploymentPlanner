import { describe, expect, it } from 'vitest';

import {
  defineStateMachine,
  type StateMachine,
} from '../../../src/domain/state-machine/define-state-machine.js';
import { InvalidStateTransitionError } from '../../../src/domain/errors/index.js';

type Status = 'A' | 'B' | 'C';

const { canTransition, assertTransition } = defineStateMachine<Status>({
  A: ['B'],
  B: ['A', 'C'],
  C: [],
});

describe('defineStateMachine', () => {
  it('allows exactly the declared transitions', () => {
    expect(canTransition('A', 'B')).toBe(true);
    expect(canTransition('B', 'A')).toBe(true);
    expect(canTransition('B', 'C')).toBe(true);
  });

  it('rejects undeclared transitions', () => {
    expect(canTransition('A', 'C')).toBe(false);
    expect(canTransition('C', 'A')).toBe(false);
    expect(canTransition('C', 'B')).toBe(false);
  });

  it('rejects staying on the same state', () => {
    expect(canTransition('A', 'A')).toBe(false);
  });

  it('assertTransition passes silently for legal moves', () => {
    expect(() => assertTransition('A', 'B')).not.toThrow();
    expect(() => assertTransition('B', 'C')).not.toThrow();
  });

  it('assertTransition throws InvalidStateTransitionError for illegal moves', () => {
    expect(() => assertTransition('A', 'C')).toThrowError(InvalidStateTransitionError);
    expect(() => assertTransition('C', 'B')).toThrowError(InvalidStateTransitionError);
    expect(() => assertTransition('A', 'A')).toThrowError(/cannot move from "A" to "A"/);
  });

  it('the machine object is reusable and typed', () => {
    const machine: StateMachine<Status> = defineStateMachine<Status>({ A: [], B: ['A', 'C'], C: [] });

    expect(machine.canTransition('A', 'B')).toBe(false);
  });
});
