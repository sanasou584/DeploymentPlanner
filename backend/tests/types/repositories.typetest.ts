/**
 * Compile-time test for repository filter typing (Item 2, Phase 6).
 * Executed by `npm run typecheck` (tsc --noEmit over src + tests). It never
 * runs at runtime; it only has to COMPILE.
 *
 * Proof log (mongo 9.11.2, typescript 5.9.3):
 *   `import type { QueryFilter, Query } from 'mongoose'` compiles — ambient
 *   module declarations are exported even without the `export` keyword.
 *   Verified with:
 *     npx tsc --noEmit --strict --target es2022 --module nodenext
 *       --moduleResolution nodenext --skipLibCheck qf-probe.ts
 *
 *   mongoose's QueryFilter does NOT reject unknown keys at compile time
 *   (`// @ts-expect-error` on `{ ownr: 'x' }` was reported as an "Unused
 *   '@ts-expect-error' directive") because mongodb's RootFilterOperators
 *   extends Document, which carries a string index signature
 *   (node_modules/mongodb/mongodb.d.ts:7838). Unknown keys are therefore
 *   guarded at RUNTIME by strictQuery:'throw' (see the "unknown filter keys
 *   throw" test in every repository spec). Wrong VALUE types, however, DO
 *   fail compilation — pinned below.
 */
import type { Types } from 'mongoose';

import type { ProjectFields, UserFields } from '../../src/models/entities/index.js';
import { type RepositoryFilter } from '../../src/repositories/index.js';

const USER_ID = '64b1f6274190d8fe2ee1ba31' as unknown as Types.ObjectId;

// Typed filters: exact field names, call-site cast-free.
const projectFilter: RepositoryFilter<ProjectFields> = { owner: USER_ID, name: 'proj' };
const userFilter: RepositoryFilter<UserFields> = {
  $or: [{ email: 'a@b.co' }, { name: 'proj' }],
  role: 'ADMIN',
};
const genericFilter = (fields: RepositoryFilter<ProjectFields>): RepositoryFilter<ProjectFields> => fields;
const chained = genericFilter({ owner: USER_ID });

// Wrong VALUE types must FAIL to compile.
// @ts-expect-error owner is an ObjectId/string — a number is not a valid condition.
const wrongValue: RepositoryFilter<ProjectFields> = { owner: 123 };
// NOTE (probe-proven): unknown KEYS (e.g. `{ ownr: 'x' }`) do NOT fail — see header.

export { chained, projectFilter, wrongValue, userFilter, genericFilter as _genericFilter };
