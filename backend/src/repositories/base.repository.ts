import type { ClientSession, HydratedDocument, Model, QueryFilter, SortOrder, Types } from 'mongoose';

import { InvariantViolationError } from '../domain/errors/index.js';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
const MIN_PAGE = 1;
const MIN_LIMIT = 1;

/**
 * Options shared by every repository method:
 * - `session` runs the query inside a transaction (requires a replica set);
 * - `withDeleted` includes soft-deleted documents (excluded by default).
 */
export interface RepositoryOptions {
  session?: ClientSession;
  withDeleted?: boolean;
  /** Optional explicit sort for generic find() (finder defaults stay theirs). */
  sort?: Record<string, SortOrder>;
}

/** Pagination input for BaseRepository.paginate. */
export interface PaginateOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, SortOrder>;
}

/** Paginated output: domain documents plus paging metadata. */
export interface PaginatedResult<TDoc> {
  items: TDoc[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

/**
 * Strictly-typed filter shape accepted by repositories.
 *
 * mongoose 9 exports `QueryFilter<T>` (proved importable by compiling
 * `import type { QueryFilter } from 'mongoose'` with tsc --noEmit). Caveat
 * verified by the same probe: unknown KEYS are NOT rejected because
 * `mongodb.RootFilterOperators` extends `Document` (string index signature,
 * node_modules/mongodb/mongodb.d.ts:7838), but wrong VALUE types do error —
 * the compile-time test in tests/types/repositories.typetest.ts pins both.
 * The generic methods below keep ONE cast because the deferred conditional
 * inside QueryFilter cannot resolve for an unresolved generic TFields;
 * concrete repositories must stay cast-free.
 */
export type RepositoryFilter<TFields> = QueryFilter<TFields>;

/** The domain document a repository returns: methods + virtuals included. */
export type RepoDoc<TFields, TMethodsObj extends object, TVirtualsObj extends object = Record<never, never>> = HydratedDocument<
  TFields,
  TMethodsObj & TVirtualsObj
>;

export function normalizedPage(page: number | undefined): number {
  const value = page ?? DEFAULT_PAGE;
  if (!Number.isInteger(value) || value < MIN_PAGE) {
    throw new InvariantViolationError(
      `page must be an integer >= ${MIN_PAGE}, got ${String(page)}`,
    );
  }
  return value;
}

export function normalizedLimit(limit: number | undefined): number {
  const value = limit ?? DEFAULT_LIMIT;
  if (!Number.isInteger(value) || value < MIN_LIMIT) {
    throw new InvariantViolationError(
      `limit must be an integer >= ${MIN_LIMIT}, got ${String(limit)}`,
    );
  }
  return value;
}

/**
 * BaseRepository - thin data-access wrapper over one Mongoose model.
 * Repositories return domain documents (rich models), never DTOs.
 * Every read method accepts { session?, withDeleted? } so services can run
 * transactions (requires a MongoDB replica set) without repository changes.
 */
export class BaseRepository<
  TFields,
  TMethodsObj extends object,
  TVirtualsObj extends object = Record<never, never>,
> {
  protected readonly model: Model<TFields, object, TMethodsObj>;

  constructor(concreteModel: object) {
    // Mongoose 9 concrete model types carry virtual/query-helper slots that do
    // not structurally reduce to the abstract Model<TFields, object, TMethods>
    // shape (method `this` depends on them), so the exact model instance is
    // narrowed here once, at the base-construction boundary. Each repository
    // passes its own model; tests cover every finder.
    this.model = concreteModel as unknown as Model<TFields, object, TMethodsObj>;
  }

  async findById(
    id: Types.ObjectId | string,
    options: RepositoryOptions = {},
  ): Promise<RepoDoc<TFields, TMethodsObj, TVirtualsObj> | null> {
    const query = this.model.findById(id).session(options.session ?? null);
    if (options.withDeleted) {
      query.setOptions({ withDeleted: true });
    }
    return (await query.exec()) as RepoDoc<TFields, TMethodsObj, TVirtualsObj> | null;
  }

  async findOne(
    filter: RepositoryFilter<TFields>,
    options: RepositoryOptions = {},
  ): Promise<RepoDoc<TFields, TMethodsObj, TVirtualsObj> | null> {
    const query = this.model.findOne(filter).session(options.session ?? null);
    if (options.withDeleted) {
      query.setOptions({ withDeleted: true });
    }
    return (await query.exec()) as RepoDoc<TFields, TMethodsObj, TVirtualsObj> | null;
  }

  async find(
    filter: RepositoryFilter<TFields>,
    options: RepositoryOptions = {},
  ): Promise<RepoDoc<TFields, TMethodsObj, TVirtualsObj>[]> {
    const query = this.model
      .find(filter)
      .session(options.session ?? null)
      .sort(options.sort ?? {});
    if (options.withDeleted) {
      query.setOptions({ withDeleted: true });
    }
    return (await query.exec()) as RepoDoc<TFields, TMethodsObj, TVirtualsObj>[];
  }

  async create(
    data: Partial<TFields>,
    options: { session?: ClientSession } = {},
  ): Promise<RepoDoc<TFields, TMethodsObj, TVirtualsObj>> {
    const createdDocs = (await this.model.create(
      [data] as never, // deferred Require_id<TFields> conditional (documented below)
      { session: options.session },
    )) as unknown as RepoDoc<TFields, TMethodsObj, TVirtualsObj>[];
    const created = createdDocs[0];
    if (!created) {
      throw new InvariantViolationError('create produced no document');
    }
    return created;
  }

  async save(
    document: RepoDoc<TFields, TMethodsObj, TVirtualsObj>,
    options: { session?: ClientSession } = {},
  ): Promise<RepoDoc<TFields, TMethodsObj, TVirtualsObj>> {
    return (await document.save(
      options.session ? { session: options.session } : undefined,
    )) as RepoDoc<TFields, TMethodsObj, TVirtualsObj>;
  }

  async exists(
    filter: RepositoryFilter<TFields>,
    options: RepositoryOptions = {},
  ): Promise<boolean> {
    return (await this.findOne(filter, options)) !== null;
  }

  async count(
    filter: RepositoryFilter<TFields>,
    options: RepositoryOptions = {},
  ): Promise<number> {
    const query = this.model.countDocuments(filter).session(options.session ?? null);
    if (options.withDeleted) {
      query.setOptions({ withDeleted: true });
    }
    return query.exec();
  }

  async paginate(
    filter: RepositoryFilter<TFields>,
    pagination: PaginateOptions,
    options: RepositoryOptions = {},
  ): Promise<PaginatedResult<RepoDoc<TFields, TMethodsObj, TVirtualsObj>>> {
    const page = normalizedPage(pagination.page);
    const limit = normalizedLimit(pagination.limit);
    const skip = (page - 1) * limit;

    const listQuery = this.model
      .find(filter)
      .sort(pagination.sort ?? { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .session(options.session ?? null);
    const countQuery = this.model
      .countDocuments(filter)
      .session(options.session ?? null);
    if (options.withDeleted) {
      listQuery.setOptions({ withDeleted: true });
      countQuery.setOptions({ withDeleted: true });
    }

    const [items, total] = await Promise.all([
      listQuery.exec() as unknown as Promise<RepoDoc<TFields, TMethodsObj, TVirtualsObj>[]>,
      countQuery.exec(),
    ]);
    const pageCount = Math.ceil(total / limit);

    return { items, total, page, limit, pageCount };
  }
}
