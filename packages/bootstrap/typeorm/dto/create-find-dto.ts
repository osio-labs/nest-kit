import { applyValidators, applyType, applySwaggerProperty } from '../decorators/shared';

type Constructor<T> = new (...args: unknown[]) => T;

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
export interface FindDto {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  relations?: string;
  /** Filter conditions as a JSON-stringified object (MongoDB-like operators). */
  filter?: string;
}

/**
 * Dynamically creates a **Find DTO** class from a TypeORM entity.
 *
 * The generated class includes pagination (`page`, `limit`), sorting
 * (`sortBy`, `sortOrder`), search (`search`), relations (`relations`),
 * and a JSON-encoded `filter` field for MongoDB-like operators.
 *
 * @example
 * ```ts
 * @Entity()
 * class User {
 *   @PrimaryGeneratedColumn() id: number;
 *   @Column() name: string;
 *   @Column() email: string;
 * }
 *
 * const FindUserDto = createFindDto(User);
 * // Query: ?page=1&limit=10&sortBy=name&sortOrder=ASC&filter={"name":"John"}
 * ```
 *
 * @param entity - The TypeORM entity class.
 */
export function createFindDto<T>(_entity: Constructor<T>): Constructor<FindDto> {
  const dtoClass = class FindDto {
    page = 1;
    limit = 20;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    search?: string;
    relations?: string;
    filter?: string;
  };

  const proto = dtoClass.prototype as unknown as Record<string, unknown>;

  Object.defineProperty(proto, 'page', {
    value: 1,
    writable: true,
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(proto, 'limit', {
    value: 20,
    writable: true,
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(proto, 'sortBy', {
    value: undefined,
    writable: true,
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(proto, 'sortOrder', {
    value: undefined,
    writable: true,
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(proto, 'search', {
    value: undefined,
    writable: true,
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(proto, 'relations', {
    value: undefined,
    writable: true,
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(proto, 'filter', {
    value: undefined,
    writable: true,
    enumerable: true,
    configurable: true,
  });

  applyValidators(proto, 'page', [{ name: 'IsOptional' }, { name: 'IsInt' }]);
  applyValidators(proto, 'limit', [{ name: 'IsOptional' }, { name: 'IsInt' }]);
  applyValidators(proto, 'sortBy', [{ name: 'IsOptional' }, { name: 'IsString' }]);
  applyValidators(proto, 'sortOrder', [{ name: 'IsOptional' }, { name: 'IsString' }]);
  applyValidators(proto, 'search', [{ name: 'IsOptional' }, { name: 'IsString' }]);
  applyValidators(proto, 'relations', [{ name: 'IsOptional' }, { name: 'IsString' }]);
  applyValidators(proto, 'filter', [{ name: 'IsOptional' }, { name: 'IsString' }]);

  applyType(proto, 'page', () => Number);
  applyType(proto, 'limit', () => Number);
  applyType(proto, 'sortBy', () => String);
  applyType(proto, 'sortOrder', () => String);
  applyType(proto, 'search', () => String);
  applyType(proto, 'relations', () => String);
  applyType(proto, 'filter', () => String);

  applySwaggerProperty(proto, 'page', {
    type: Number,
    required: false,
    example: 1,
    description: 'Page number (1-based)',
  });
  applySwaggerProperty(proto, 'limit', {
    type: Number,
    required: false,
    example: 20,
    description: 'Items per page',
  });
  applySwaggerProperty(proto, 'sortBy', {
    type: String,
    required: false,
    description: 'Field to sort by',
  });
  applySwaggerProperty(proto, 'sortOrder', {
    type: String,
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort direction',
  });
  applySwaggerProperty(proto, 'search', {
    type: String,
    required: false,
    description: 'Full-text search across string fields',
  });
  applySwaggerProperty(proto, 'relations', {
    type: String,
    required: false,
    description: 'Comma-separated relation names to include',
  });
  applySwaggerProperty(proto, 'filter', {
    type: String,
    required: false,
    description: 'Filter conditions as a JSON-stringified object (MongoDB-like operators)',
  });

  return dtoClass;
}
