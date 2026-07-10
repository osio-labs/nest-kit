import type { FindManyOptions, FindOptionsOrder, FindOptionsWhere, ObjectLiteral } from 'typeorm';

/**
 * Supported filter operators, passed inside a JSON object
 * via the `filter` query parameter.
 *
 * | Operator        | TypeORM function    |
 * | --------------- | ------------------- |
 * | `$eq`           | direct match        |
 * | `$neq`          | `Not`               |
 * | `$gt`           | `MoreThan`          |
 * | `$gte`          | `MoreThanOrEqual`   |
 * | `$lt`           | `LessThan`          |
 * | `$lte`          | `LessThanOrEqual`   |
 * | `$in`           | `In`                |
 * | `$between`      | `Between`           |
 * | `$contains`     | `ILike(%value%)`    |
 * | `$starts_with`  | `ILike(value%)`     |
 * | `$ends_with`    | `ILike(%value)`     |
 * | `$and`          | `And` (top-level)   |
 * | `$or`           | `Or` (top-level)    |
 */
export type FilterOperator =
  | '$eq'
  | '$neq'
  | '$gt'
  | '$gte'
  | '$lt'
  | '$lte'
  | '$in'
  | '$between'
  | '$contains'
  | '$starts_with'
  | '$ends_with';

/**
 * Raw query parameters accepted by `buildFindOptions`.
 *
 * Supports pagination, sorting, JSON-encoded filter, search, and relations.
 *
 * @example
 * ```http
 * GET /users?page=1&limit=10&sortBy=name&sortOrder=ASC&filter={"age":{"$gte":18}}&search=john
 * ```
 */
export interface FindOptionsQuery {
  /** Page number (1-based). */
  page?: number;
  /** Items per page (default: 20, max: 100). */
  limit?: number;
  /** Number of records to skip (alternative to `page`/`limit`). */
  skip?: number;
  /** Number of records to take (alternative to `page`/`limit`). */
  take?: number;
  /** Field name to sort by. */
  sortBy?: string;
  /** Sort direction. */
  sortOrder?: 'ASC' | 'DESC';
  /** Filter conditions as a JSON-stringified object (MongoDB-like operators). */
  filter?: string;
  /** Full-text search across all string columns. */
  search?: string;
  /** Comma-separated relation names to include. */
  relations?: string | string[];
  [key: string]: unknown;
}

/**
 * Result of `buildFindOptions`.
 *
 * Contains the TypeORM `FindManyOptions` ready to pass to `findAndCount`,
 * plus the resolved `page` and `limit` for response pagination metadata.
 */
export interface BuildFindOptionsResult<T> {
  /** TypeORM find options (skip, take, order, where, relations). */
  options: FindManyOptions<T>;
  /** Resolved page number (after clamping). */
  page: number;
  /** Resolved page size (after clamping). */
  limit: number;
  /** Optional total count (not set by `buildFindOptions` itself). */
  total?: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePagination(query: FindOptionsQuery): {
  skip: number;
  take: number;
  page: number;
  limit: number;
} {
  const page = Math.max(1, Number(query.page) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  return { skip, take: limit, page, limit };
}

function parseOrder<T>(
  query: FindOptionsQuery,
  stringFields: Set<string>,
): FindOptionsOrder<T> | undefined {
  const { sortBy, sortOrder } = query;
  if (!sortBy || typeof sortBy !== 'string') return undefined;
  if (!stringFields.has(sortBy)) return undefined;
  const order = sortOrder === 'DESC' ? 'DESC' : 'ASC';
  return { [sortBy]: order } as FindOptionsOrder<T>;
}

type TypeormOperators = ReturnType<typeof loadTypeormOperators>;

function loadTypeormOperators(): Record<string, (...args: unknown[]) => unknown> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('typeorm') as Record<string, (...args: unknown[]) => unknown>;
  } catch {
    return {};
  }
}

function applyOperator(
  operator: string,
  raw: unknown,
  isNumeric: boolean,
  _isDate: boolean,
  ops: TypeormOperators,
): unknown {
  switch (operator) {
    case '$eq':
      return raw;
    case '$neq':
      return ops.Not?.(raw) ?? raw;
    case '$gt': {
      const n = isNumeric ? Number(raw) : raw;
      return ops.MoreThan?.(n) ?? n;
    }
    case '$gte': {
      const n = isNumeric ? Number(raw) : raw;
      return ops.MoreThanOrEqual?.(n) ?? n;
    }
    case '$lt': {
      const n = isNumeric ? Number(raw) : raw;
      return ops.LessThan?.(n) ?? n;
    }
    case '$lte': {
      const n = isNumeric ? Number(raw) : raw;
      return ops.LessThanOrEqual?.(n) ?? n;
    }
    case '$in': {
      const arr = Array.isArray(raw) ? raw : [];
      return ops.In?.(arr) ?? arr;
    }
    case '$between': {
      const arr = Array.isArray(raw) ? raw : [];
      return ops.Between?.(arr) ?? raw;
    }
    case '$contains':
      return ops.ILike?.(`%${String(raw)}%`) ?? raw;
    case '$starts_with':
      return ops.ILike?.(`${String(raw)}%`) ?? raw;
    case '$ends_with':
      return ops.ILike?.(`%${String(raw)}`) ?? raw;
    default:
      return raw;
  }
}

function parseCondition(
  obj: Record<string, unknown>,
  stringFields: Set<string>,
  numericFields: Set<string>,
  dateFields: Set<string>,
  booleanFields: Set<string>,
  ops: TypeormOperators,
): Record<string, unknown> | Record<string, unknown>[] | undefined {
  let where: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    if (key === '$or') {
      if (!Array.isArray(val)) continue;
      const orItems: Record<string, unknown>[] = [];
      for (const sub of val) {
        if (typeof sub !== 'object' || sub === null) continue;
        const subResult = parseCondition(
          sub as Record<string, unknown>,
          stringFields,
          numericFields,
          dateFields,
          booleanFields,
          ops,
        );
        if (subResult) {
          if (Array.isArray(subResult)) {
            orItems.push(...subResult);
          } else {
            orItems.push(subResult);
          }
        }
      }
      if (orItems.length > 0) {
        const merged =
          Object.keys(where).length > 0 ? orItems.map((item) => ({ ...where, ...item })) : orItems;
        where = {}; // move everything into the OR array
        return merged;
      }
      continue;
    }

    const isKnown =
      stringFields.has(key) ||
      numericFields.has(key) ||
      dateFields.has(key) ||
      booleanFields.has(key);
    if (!isKnown) continue;

    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      const condObj = val as Record<string, unknown>;
      const entries = Object.entries(condObj);
      if (entries.length === 1) {
        where[key] = applyOperator(
          entries[0][0],
          entries[0][1],
          numericFields.has(key),
          dateFields.has(key),
          ops,
        );
      } else {
        const opsList = entries.map(([op, opVal]) =>
          applyOperator(op, opVal, numericFields.has(key), dateFields.has(key), ops),
        );
        where[key] = ops.And?.(...opsList) ?? opsList;
      }
    } else {
      where[key] = applyOperator('$eq', val, numericFields.has(key), false, ops);
    }
  }

  if (Object.keys(where).length === 0) return undefined;
  return where;
}

function parseWhere<T extends ObjectLiteral>(
  query: FindOptionsQuery,
  stringFields: Set<string>,
  numericFields: Set<string>,
  dateFields: Set<string>,
  booleanFields: Set<string>,
  ops: TypeormOperators,
): FindOptionsWhere<T>[] | FindOptionsWhere<T> | undefined {
  const { Like: LikeFn } = ops;
  const Like = LikeFn ?? ((_p: string) => ({}));

  let filterObj: Record<string, unknown> | undefined;
  const filterRaw = query.filter;
  if (filterRaw && typeof filterRaw === 'string') {
    try {
      filterObj = JSON.parse(filterRaw) as Record<string, unknown>;
    } catch {
      filterObj = undefined;
    }
  }

  let where: FindOptionsWhere<T> | FindOptionsWhere<T>[] | undefined;

  if (filterObj && typeof filterObj === 'object' && !Array.isArray(filterObj)) {
    // Check for top-level $and / $or
    const andItems = filterObj.$and;
    const orItems = filterObj.$or;
    const rest = { ...filterObj };
    delete rest.$and;
    delete rest.$or;

    // Process regular field conditions
    const baseWhere =
      Object.keys(rest).length > 0
        ? parseCondition(rest, stringFields, numericFields, dateFields, booleanFields, ops)
        : undefined;

    // Process $and (merge all conditions)
    if (Array.isArray(andItems)) {
      for (const item of andItems) {
        if (typeof item !== 'object' || item === null) continue;
        const subResult = parseCondition(
          item as Record<string, unknown>,
          stringFields,
          numericFields,
          dateFields,
          booleanFields,
          ops,
        );
        if (subResult) {
          if (Array.isArray(subResult)) {
            // $and containing $or — merge each OR branch with baseWhere
            const merged = subResult.map((orItem) => ({
              ...(typeof baseWhere === 'object' && !Array.isArray(baseWhere) ? baseWhere : {}),
              ...orItem,
            })) as FindOptionsWhere<T>[];
            where = mergeWhere(where, merged);
          } else if (Array.isArray(where)) {
            where = where.map((w) => ({ ...w, ...subResult }));
          } else {
            const merged = {
              ...(typeof baseWhere === 'object' && !Array.isArray(baseWhere) ? baseWhere : {}),
              ...subResult,
            };
            where = Object.keys(merged).length > 0 ? (merged as FindOptionsWhere<T>) : undefined;
          }
        }
      }
    }

    // Process $or
    if (Array.isArray(orItems)) {
      const branches: FindOptionsWhere<T>[] = [];
      for (const item of orItems) {
        if (typeof item !== 'object' || item === null) continue;
        const subResult = parseCondition(
          item as Record<string, unknown>,
          stringFields,
          numericFields,
          dateFields,
          booleanFields,
          ops,
        );
        if (subResult) {
          if (Array.isArray(subResult)) {
            branches.push(...(subResult as FindOptionsWhere<T>[]));
          } else {
            branches.push(subResult as FindOptionsWhere<T>);
          }
        }
      }
      if (branches.length > 0) {
        const base = typeof baseWhere === 'object' && !Array.isArray(baseWhere) ? baseWhere : {};
        const merged = branches.map((b) => ({ ...base, ...b }));
        where = mergeWhere(where, merged);
      }
    }

    // If no $and/$or, use baseWhere directly
    if (!Array.isArray(andItems) && !Array.isArray(orItems) && baseWhere) {
      where = baseWhere as FindOptionsWhere<T>;
    }
  }

  const search = query.search;
  if (search && typeof search === 'string' && stringFields.size > 0) {
    const searchConditions = [...stringFields].map(
      (f) => ({ [f]: Like(`%${search}%`) }) as FindOptionsWhere<T>,
    );
    if (where) {
      if (Array.isArray(where)) {
        return where
          .map((w) => {
            const merged = searchConditions.map((sc) => ({ ...w, ...sc }));
            return merged.length === 1 ? merged[0] : merged;
          })
          .flat() as FindOptionsWhere<T>[];
      }
      return searchConditions.map((sc) => ({ ...(where as Record<string, unknown>), ...sc }));
    }
    return searchConditions;
  }

  return where;
}

function mergeWhere<T extends ObjectLiteral>(
  existing: FindOptionsWhere<T> | FindOptionsWhere<T>[] | undefined,
  incoming: FindOptionsWhere<T>[],
): FindOptionsWhere<T>[] {
  if (!existing) return incoming;
  const arr = Array.isArray(existing) ? existing : [existing];
  const result: FindOptionsWhere<T>[] = [];
  for (const a of arr) {
    for (const b of incoming) {
      result.push({ ...a, ...b });
    }
  }
  return result;
}

function parseRelations(query: FindOptionsQuery): string[] | undefined {
  const { relations } = query;
  if (!relations) return undefined;
  if (Array.isArray(relations)) return relations;
  if (typeof relations === 'string') return relations.split(',').map((r) => r.trim());
  return undefined;
}

/**
 * Categorised column sets used internally by `buildFindOptions`
 * to route filter values to the correct TypeORM operator.
 *
 * @internal
 */
export interface EntityColumnInfo {
  /** Column names treated as string (supports `Like` search). */
  stringFields: Set<string>;
  /** Column names treated as numeric (exact match). */
  numericFields: Set<string>;
  /** Column names treated as date (exact match). */
  dateFields: Set<string>;
  /** Column names treated as boolean (exact match). */
  booleanFields: Set<string>;
}

type TypeOrRecord = string[] | Record<string, string>;

function getColumnInfo(columns: TypeOrRecord): EntityColumnInfo {
  const stringFields = new Set<string>();
  const numericFields = new Set<string>();
  const dateFields = new Set<string>();
  const booleanFields = new Set<string>();

  const entries = Array.isArray(columns)
    ? columns.map((c) => [c, 'string'])
    : Object.entries(columns);

  for (const [name, type] of entries) {
    const t = String(type).toLowerCase();
    if (['string', 'varchar', 'text', 'citext', 'char'].some((s) => t.includes(s))) {
      stringFields.add(name);
    } else if (['number', 'int', 'float', 'decimal', 'bigint'].some((s) => t.includes(s))) {
      numericFields.add(name);
    } else if (['date', 'timestamp', 'datetime'].some((s) => t.includes(s))) {
      dateFields.add(name);
    } else if (['boolean', 'bool'].some((s) => t.includes(s))) {
      booleanFields.add(name);
    }
  }

  return { stringFields, numericFields, dateFields, booleanFields };
}

/**
 * Build TypeORM `FindManyOptions` from a controller query object.
 *
 * Parses pagination (`page`, `limit`), sorting (`sortBy`, `sortOrder`),
 * JSON-encoded filtering (`filter`), search (`search`), and relations (`relations`).
 *
 * The `filter` parameter is a JSON-stringified object with intuitive operators:
 *
 * ```json
 * // ?filter={"age":{"$gte":18,"$lte":60},"$or":[{"name":{"$contains":"john"}},{"email":{"$contains":"john"}}]}
 * {
 *   "age": { "$gte": 18, "$lte": 60 },
 *   "$or": [
 *     { "name": { "$contains": "john" } },
 *     { "email": { "$contains": "john" } }
 *   ]
 * }
 * ```
 *
 * `null` values produce `IS NULL`:
 * ```json
 * { "deletedAt": null }
 * ```
 *
 * @example
 * ```ts
 * // Controller
 * @Get()
 * async findAll(@Query() query: Record<string, unknown>) {
 *   const { options, page, limit } = buildFindOptions(
 *     ['name', 'email', 'age'],
 *     query,
 *   );
 *   const [data, total] = await repo.findAndCount(options);
 *   return { data, total, page, limit };
 * }
 * ```
 *
 * @param columns - Array of column names (all treated as string),
 *                  or a record of `{ fieldName: 'string' | 'number' | 'date' | 'boolean' }`.
 * @param query   - Raw query object from NestJS `@Query()`.
 */
export function buildFindOptions<T extends ObjectLiteral>(
  columns: string[] | Record<string, string>,
  query: FindOptionsQuery,
): BuildFindOptionsResult<T> {
  const { skip, take, page, limit } = parsePagination(query);
  const { stringFields, numericFields, dateFields, booleanFields } = getColumnInfo(columns);
  const ops = loadTypeormOperators();

  return {
    options: {
      skip,
      take,
      order: parseOrder(query, stringFields),
      where: parseWhere(query, stringFields, numericFields, dateFields, booleanFields, ops),
      relations: parseRelations(query),
    } as FindManyOptions<T>,
    page,
    limit,
  };
}
