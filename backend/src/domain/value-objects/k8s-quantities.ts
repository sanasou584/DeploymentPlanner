/**
 * Kubernetes resource quantity parsing.
 * CPU: "250m" (millicores) or "0.5" (cores, value as decimal string).
 * Memory: binary units Ki/Mi/Gi/Ti/Pi/Ei (1024-based), decimal units
 * k/M/G/T/P/E (1000-based), or plain bytes ("4096").
 * Both return base units - millicores for CPU, bytes for memory - and THROW
 * (never silently coerce) on invalid formats.
 */
export class InvalidQuantityError extends Error {
  constructor(
    readonly input: string,
    readonly kind: 'cpu' | 'memory',
  ) {
    super(`Invalid Kubernetes ${kind} quantity: "${input}"`);
  }
}

const NUMBER = /^\d+(?:\.\d+)?$/;

export function parseCpu(input: string): number {
  if (input.endsWith('m')) {
    const millis = input.slice(0, -1);
    if (!NUMBER.test(millis)) {
      throw new InvalidQuantityError(input, 'cpu');
    }
    return Number(millis);
  }
  if (!NUMBER.test(input)) {
    throw new InvalidQuantityError(input, 'cpu');
  }
  return Math.round(Number(input) * 1000);
}

const MEMORY_UNITS: Readonly<Record<string, number>> = {
  '': 1,
  k: 1000,
  M: 1000 ** 2,
  G: 1000 ** 3,
  T: 1000 ** 4,
  P: 1000 ** 5,
  E: 1000 ** 6,
  Ki: 1024,
  Mi: 1024 ** 2,
  Gi: 1024 ** 3,
  Ti: 1024 ** 4,
  Pi: 1024 ** 5,
  Ei: 1024 ** 6,
};

export function parseMemory(input: string): number {
  const match = /^(\d+(?:\.\d+)?)(Ki|Mi|Gi|Ti|Pi|Ei|[kMGTPE])?$/.exec(input);
  if (!match) {
    throw new InvalidQuantityError(input, 'memory');
  }
  const [, amount, unit = ''] = match;
  if (!amount) {
    throw new InvalidQuantityError(input, 'memory');
  }
  const multiplier = MEMORY_UNITS[unit] ?? 0;
  if (multiplier === 0) {
    throw new InvalidQuantityError(input, 'memory');
  }
  return Math.round(Number(amount) * multiplier);
}
