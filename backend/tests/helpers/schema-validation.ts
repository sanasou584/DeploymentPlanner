import type { Document } from 'mongoose';

/**
 * Runs `await doc.validate()` (NOT the deprecated `validateSync`, which skips
 * sub-document pre('validate') hooks) and returns the failing path keys from
 * the rejected ValidationError. An empty array means the document validated.
 */
export async function validatedErrorPaths(doc: Document): Promise<string[]> {
  let rejection: { errors?: Record<string, unknown> } | undefined;

  try {
    await doc.validate();
  } catch (e: unknown) {
    rejection = e as { errors?: Record<string, unknown> };
  }

  return Object.keys(rejection?.errors ?? {});
}
