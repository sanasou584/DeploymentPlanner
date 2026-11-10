/**
 * Barrel of the contract types that are GENUINELY reused across layers.
 * Criterion (docs/conventions.md, "Types & contracts"): a type goes here ONLY
 * if two+ layers need it; a module-local shape is derived where it lives
 * (export type XxxService = ReturnType<typeof createXxxService>).
 */
export * from './auth.types.js';
export * from './github.types.js';
export * from './session-token.types.js';
export * from './user.types.js';
