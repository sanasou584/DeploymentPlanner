import { Schema } from 'mongoose';

import { InvariantViolationError } from '../../domain/errors/index.js';
import { isValidHostname } from '../../domain/value-objects/repository-url.js';

export interface IngressSpecFields {
  enabled: boolean;
  host?: string;
  path?: string;
  tls: boolean;
}

export interface IngressSpecMethods {
  /** Invariant: when enabled, host is required and must be a valid hostname. */
  assertInvariants(): void;
}

export type IngressSpecSchemaType = Schema<IngressSpecFields, unknown, IngressSpecMethods>;

export const ingressSpecSchema: IngressSpecSchemaType = new Schema<
  IngressSpecFields,
  unknown,
  IngressSpecMethods
>(
  {
    enabled: { type: Boolean, required: true, default: false },
    host: { type: String },
    path: { type: String, default: '/' },
    tls: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

ingressSpecSchema.methods.assertInvariants = function assertInvariants(
  this: IngressSpecFields & IngressSpecMethods,
): void {
  if (!this.enabled) {
    return;
  }
  if (this.host === undefined || this.host.length === 0 || !isValidHostname(this.host)) {
    throw new InvariantViolationError('Ingress with enabled=true requires a valid host', {
      host: this.host,
    });
  }
};

ingressSpecSchema.pre(
  'validate',
  function runIngressInvariant(this: IngressSpecFields & IngressSpecMethods): void {
    this.assertInvariants();
  },
);
