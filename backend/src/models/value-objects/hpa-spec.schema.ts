import { Schema } from 'mongoose';

import { InvariantViolationError } from '../../domain/errors/index.js';

export interface HpaSpecFields {
  enabled: boolean;
  minReplicas?: number;
  maxReplicas?: number;
  targetCpuUtilizationPercent?: number;
  targetMemoryUtilizationPercent?: number;
}

export interface HpaSpecMethods {
  /** Invariant: when enabled, minReplicas >= 1 and maxReplicas >= minReplicas. */
  assertInvariants(): void;
}

function isIntegerBetween(value: number | undefined, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

export type HpaSpecSchemaType = Schema<HpaSpecFields, unknown, HpaSpecMethods>;

export const hpaSpecSchema: HpaSpecSchemaType = new Schema<HpaSpecFields, unknown, HpaSpecMethods>(
  {
    enabled: { type: Boolean, required: true, default: false },
    minReplicas: { type: Number },
    maxReplicas: { type: Number },
    targetCpuUtilizationPercent: { type: Number },
    targetMemoryUtilizationPercent: { type: Number },
  },
  { _id: false },
);

hpaSpecSchema.methods.assertInvariants = function assertInvariants(
  this: HpaSpecFields & HpaSpecMethods,
): void {
  if (!this.enabled) {
    return;
  }

  const minReplicas = this.minReplicas;
  const maxReplicas = this.maxReplicas;
  const targetCpu = this.targetCpuUtilizationPercent;
  const targetMemory = this.targetMemoryUtilizationPercent;

  if (!isIntegerBetween(minReplicas, 1, Number.MAX_SAFE_INTEGER)) {
    throw new InvariantViolationError('HPA with enabled=true requires an integer minReplicas >= 1');
  }
  if (maxReplicas === undefined || maxReplicas < minReplicas) {
    throw new InvariantViolationError('HPA with enabled=true requires maxReplicas >= minReplicas', {
      minReplicas,
      maxReplicas,
    });
  }
  if (!isIntegerBetween(targetCpu, 1, 100)) {
    throw new InvariantViolationError(
      'HPA with enabled=true requires targetCpuUtilizationPercent between 1 and 100',
    );
  }
  if (targetMemory !== undefined && !isIntegerBetween(targetMemory, 1, 100)) {
    throw new InvariantViolationError(
      'HPA targetMemoryUtilizationPercent must be between 1 and 100 when provided',
    );
  }
};

hpaSpecSchema.pre('validate', function runHpaInvariant(this: HpaSpecFields & HpaSpecMethods): void {
  this.assertInvariants();
});
