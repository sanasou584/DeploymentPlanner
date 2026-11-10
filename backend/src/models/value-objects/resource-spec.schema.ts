import { Schema } from 'mongoose';

import { InvariantViolationError } from '../../domain/errors/index.js';
import { parseCpu, parseMemory } from '../../domain/value-objects/k8s-quantities.js';

export interface ResourceAmount {
  cpu: string;
  memory: string;
}

export interface ResourceSpecFields {
  requests: ResourceAmount;
  limits: ResourceAmount;
}

export interface ResourceSpecMethods {
  /** Invariant: limits >= requests for both CPU and memory. */
  assertLimitsCoverRequests(): void;
}

type ResourceSpecCheckValue = { value: string };

const quantityValidator = (kind: 'cpu' | 'memory') => ({
  validator: (value: string): boolean => {
    try {
      return kind === 'cpu' ? parseCpu(value) >= 0 : parseMemory(value) >= 0;
    } catch {
      return false;
    }
  },
  message: (props: ResourceSpecCheckValue): string =>
    `Invalid Kubernetes ${kind} quantity: "${props.value}"`,
});

const resourceAmountDefinition = {
  cpu: { type: String, required: true, validate: quantityValidator('cpu') },
  memory: { type: String, required: true, validate: quantityValidator('memory') },
} as const;

export function makeResourceAmountSchema(): Schema<ResourceAmount> {
  return new Schema<ResourceAmount>(resourceAmountDefinition, { _id: false });
}

export type ResourceSpecSchemaType = Schema<ResourceSpecFields, unknown, ResourceSpecMethods>;
export const resourceSpecSchema: ResourceSpecSchemaType = new Schema<
  ResourceSpecFields,
  unknown,
  ResourceSpecMethods
>(
  {
    // fresh subschema instances (Mongoose misbehaves when the same subdoc
    // schema object is embedded at two paths)
    requests: { type: makeResourceAmountSchema(), required: true },
    limits: { type: makeResourceAmountSchema(), required: true },
  },
  {
    _id: false,
  },
);

const parseOrUndefined = (kind: 'cpu' | 'memory', value: string): number | undefined => {
  try {
    return kind === 'cpu' ? parseCpu(value) : parseMemory(value);
  } catch {
    return undefined;
  }
};

resourceSpecSchema.methods.assertLimitsCoverRequests = function assertLimitsCoverRequests(
  this: ResourceSpecFields & ResourceSpecMethods,
): void {
  const requestCpu = parseOrUndefined('cpu', this.requests.cpu);
  const requestMemory = parseOrUndefined('memory', this.requests.memory);
  const limitCpu = parseOrUndefined('cpu', this.limits.cpu);
  const limitMemory = parseOrUndefined('memory', this.limits.memory);

  // Malformed quantities are rejected by the path validators; the invariant
  // only applies when all four values are well-formed.
  if (
    requestCpu === undefined ||
    requestMemory === undefined ||
    limitCpu === undefined ||
    limitMemory === undefined
  ) {
    return;
  }

  if (limitCpu < requestCpu || limitMemory < requestMemory) {
    throw new InvariantViolationError(
      'Kubernetes limits must be greater than or equal to requests for both CPU and memory',
      {
        requests: { cpu: this.requests.cpu, memory: this.requests.memory },
        limits: { cpu: this.limits.cpu, memory: this.limits.memory },
      },
    );
  }
};

resourceSpecSchema.pre(
  'validate',
  function runResourceSpecInvariant(this: ResourceSpecFields & ResourceSpecMethods): void {
    this.assertLimitsCoverRequests();
  },
);
