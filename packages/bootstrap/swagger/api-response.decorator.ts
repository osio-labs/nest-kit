import type { Type } from '@nestjs/common';
import type { SwaggerModule } from './swagger.helper.js';
import { getSwagger } from './swagger.helper.js';

// ── Internal types ────────────────────────────────────────────────

type ErrorResponse = string | string[] | true;

interface CrudErrors {
  badRequest?: ErrorResponse;
  unauthorized?: ErrorResponse;
  forbidden?: ErrorResponse;
  notFound?: ErrorResponse;
  conflict?: ErrorResponse;
  unprocessable?: ErrorResponse;
  tooManyRequests?: ErrorResponse;
}

/** Options for the {@link ApiResponse} method decorator. */
export interface ApiResponseOptions<T> {
  /** Entity class to document in the response schema. */
  type: Type<T>;
  /**
   * Response mode.
   *
   * - `'single'` (default) — `{ data: T }`
   * - `'list'`            — `{ data: T[] }`
   * - `'paged'`            — `{ data: T[], total, page, limit }`
   * - `'offset'`           — `{ data: T[], total, skip, limit }`
   * - `'cursor'`           — `{ data: T[], nextCursor?, hasMore }`
   */
  mode?: 'single' | 'list' | 'paged' | 'offset' | 'cursor';
  /** HTTP status code. Defaults to auto-detected value (GET/PATCH=200, POST=201, DELETE=204). */
  status?: number;
  /** Description shown in Swagger UI next to the status code. */
  description?: string;
  /** Error responses keyed by HTTP status name. Accepts a string, an array of strings, or `true` for a default message. */
  errors?: CrudErrors;
}

/** Per-operation error configuration for {@link CrudApi}. */
interface CrudApiOperationConfig {
  errors?: CrudErrors;
  /** Response mode override. Defaults to `'single'` for most operations, `'list'` for `findAll`. */
  mode?: 'single' | 'paged' | 'offset' | 'cursor';
}

/**
 * Configuration for {@link CrudApi}.
 *
 * Each key maps to a CRUD operation. The decorator auto-detects the HTTP method
 * on each controller method and applies the appropriate success response.
 * Error responses are applied from this configuration.
 */
export interface CrudApiOptions {
  findAll?: CrudApiOperationConfig;
  create?: CrudApiOperationConfig;
  findOne?: CrudApiOperationConfig;
  update?: CrudApiOperationConfig;
  delete?: CrudApiOperationConfig;
}

// ── Constants ─────────────────────────────────────────────────────

/** Reflect metadata key used by `@nestjs/common` to store the HTTP method on a handler. */
const METHOD_METADATA = 'method';

type ErrorDecoratorName =
  | 'ApiBadRequestResponse'
  | 'ApiUnauthorizedResponse'
  | 'ApiForbiddenResponse'
  | 'ApiNotFoundResponse'
  | 'ApiConflictResponse'
  | 'ApiUnprocessableEntityResponse'
  | 'ApiTooManyRequestsResponse';

const ERROR_STATUS_MAP: Record<string, { decorator: ErrorDecoratorName; fallback: string }> = {
  badRequest: { decorator: 'ApiBadRequestResponse', fallback: 'Bad request' },
  unauthorized: { decorator: 'ApiUnauthorizedResponse', fallback: 'Unauthorized' },
  forbidden: { decorator: 'ApiForbiddenResponse', fallback: 'Forbidden' },
  notFound: { decorator: 'ApiNotFoundResponse', fallback: 'Not found' },
  conflict: { decorator: 'ApiConflictResponse', fallback: 'Conflict' },
  unprocessable: { decorator: 'ApiUnprocessableEntityResponse', fallback: 'Unprocessable entity' },
  tooManyRequests: { decorator: 'ApiTooManyRequestsResponse', fallback: 'Too many requests' },
};

const HTTP_METHOD_NAMES: Record<number, string> = {
  0: 'get',
  1: 'post',
  2: 'put',
  3: 'delete',
  4: 'patch',
};

const DEFAULT_STATUS: Record<string, number> = {
  get: 200,
  post: 201,
  put: 200,
  patch: 200,
  delete: 204,
};

// ── Internal helpers ──────────────────────────────────────────────

function formatDescription(value: string | true, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Build a response schema for a single entity wrapped in `{ data: T }`.
 */
function singleSchema(s: SwaggerModule, entity: Type<unknown>): Record<string, unknown> {
  return {
    schema: {
      type: 'object',
      properties: {
        data: { $ref: s.getSchemaPath(entity) },
      },
      required: ['data'],
    },
  };
}

/**
 * Build a response schema for an array wrapped in `{ data: T[] }`.
 */
function listSchema(s: SwaggerModule, entity: Type<unknown>): Record<string, unknown> {
  return {
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: s.getSchemaPath(entity) },
        },
      },
      required: ['data'],
    },
  };
}

/**
 * Apply success + error response decorators to a method.
 *
 * Detects the HTTP method from NestJS metadata and picks the appropriate
 * response decorator and default status code. Error responses are applied
 * from the `errors` configuration.
 */
function applySwaggerDecorators(
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
  options: ApiResponseOptions<unknown>,
  httpMethod?: string,
): void {
  const s = getSwagger();
  if (!s) return;

  // ── Success response ──────────────────────────────────────────
  s.ApiExtraModels(options.type)(target, propertyKey, descriptor);

  const mode = options.mode ?? 'single';
  const method = httpMethod ?? 'get';

  let responseDecorator: keyof SwaggerModule;
  let schema: Record<string, unknown>;

  const explicitStatus = options.status;
  const effectiveMethod =
    httpMethod ?? (explicitStatus === 201 ? 'post' : explicitStatus === 204 ? 'delete' : method);

  switch (effectiveMethod) {
    case 'delete':
      responseDecorator = 'ApiNoContentResponse';
      schema = {};
      break;
    case 'post':
      responseDecorator = 'ApiCreatedResponse';
      schema = mode === 'single' ? singleSchema(s, options.type) : listSchema(s, options.type);
      break;
    default:
      responseDecorator = 'ApiOkResponse';
      switch (mode) {
        case 'list':
          schema = listSchema(s, options.type);
          break;
        case 'paged':
          schema = pagedSchema(s, options.type);
          break;
        case 'offset':
          schema = offsetSchema(s, options.type);
          break;
        case 'cursor':
          schema = cursorSchema(s, options.type);
          break;
        default:
          schema = singleSchema(s, options.type);
          break;
      }
      break;
  }

  const status = options.status ?? DEFAULT_STATUS[effectiveMethod] ?? 200;
  const description = options.description ?? '';

  s[responseDecorator]({ status, description, ...schema })(target, propertyKey, descriptor);

  // ── Error responses ───────────────────────────────────────────
  if (options.errors) {
    for (const [key, rawValue] of Object.entries(options.errors)) {
      if (rawValue === undefined) continue;

      const mapping = ERROR_STATUS_MAP[key];
      if (!mapping) continue;

      const value = rawValue as ErrorResponse;
      const messages: string[] = Array.isArray(value)
        ? value
        : [formatDescription(value, mapping.fallback)];

      for (const msg of messages) {
        const fn = s[mapping.decorator];
        fn({ description: msg })(target, propertyKey, descriptor);
      }
    }
  }
}

/**
 * Build a paged response schema: `{ data: T[], total, page, limit }`.
 */
function pagedSchema(s: SwaggerModule, entity: Type<unknown>): Record<string, unknown> {
  return {
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: s.getSchemaPath(entity) } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
      required: ['data', 'total', 'page', 'limit'],
    },
  };
}

/**
 * Build an offset response schema: `{ data: T[], total, skip, limit }`.
 */
function offsetSchema(s: SwaggerModule, entity: Type<unknown>): Record<string, unknown> {
  return {
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: s.getSchemaPath(entity) } },
        total: { type: 'number' },
        skip: { type: 'number' },
        limit: { type: 'number' },
      },
      required: ['data', 'total', 'skip', 'limit'],
    },
  };
}

/**
 * Build a cursor response schema: `{ data: T[], nextCursor?, hasMore }`.
 */
function cursorSchema(s: SwaggerModule, entity: Type<unknown>): Record<string, unknown> {
  return {
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: s.getSchemaPath(entity) } },
        nextCursor: { type: 'string', nullable: true },
        hasMore: { type: 'boolean' },
      },
      required: ['data', 'hasMore'],
    },
  };
}

/**
 * Detect the HTTP method of a controller method from NestJS metadata.
 *
 * @param target      - The class prototype.
 * @param propertyKey - The method name.
 * @returns The lowercase HTTP method (`'get'`, `'post'`, `'patch'`, `'delete'`, `'put'`) or `undefined`.
 */
function detectHttpMethod(target: object, propertyKey: string | symbol): string | undefined {
  const methodFn = (target as Record<string | symbol, unknown>)[propertyKey];
  if (typeof methodFn !== 'function') return undefined;

  const methodValue = Reflect.getMetadata(METHOD_METADATA, methodFn) as number | undefined;
  if (methodValue === undefined) return undefined;

  return HTTP_METHOD_NAMES[methodValue];
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Decorator that applies Swagger response metadata for a controller method.
 *
 * Automatically detects the HTTP method (`@Get`, `@Post`, `@Patch`, `@Delete`)
 * and applies the appropriate success response:
 *
 * - `GET`    → 200 `{ data: T }` or paginated schema
 * - `POST`   → 201 `{ data: T }`
 * - `PATCH`  → 200 `{ data: T }`
 * - `DELETE` → 204 (no body)
 *
 * @example
 * ```ts
 * // GET single — 200
 * @Get(':id')
 * @ApiResponse(User, { errors: { notFound: 'User not found' } })
 * findOne(@Param('id') id: string) {}
 *
 * // GET paged — 200
 * @Get()
 * @ApiResponse(User, { mode: 'paged' })
 * findAll(@Query() q: FindDto) {}
 *
 * // POST — 201
 * @Post()
 * @ApiResponse(User, {
 *   errors: {
 *     conflict: ['Email already exists', 'Username taken'],
 *     badRequest: 'Validation failed',
 *   },
 * })
 * create(@Body() dto: CreateUserDto) {}
 *
 * // DELETE — 204
 * @Delete(':id')
 * @ApiResponse(User, { errors: { notFound: 'User not found' } })
 * remove(@Param('id') id: string) {}
 * ```
 *
 * Gracefully no-ops when `@nestjs/swagger` is not installed.
 *
 * @param options - Response configuration including entity, mode, and errors.
 */
/** Shorthand: entity only — defaults to single mode. */
export function ApiResponse<T>(entity: Type<T>): MethodDecorator;
/** Shorthand: entity + partial options (mode, status, description, errors). */
export function ApiResponse<T>(
  entity: Type<T>,
  options?: Omit<ApiResponseOptions<T>, 'type'>,
): MethodDecorator;
/** Full options object. */
export function ApiResponse<T>(options: ApiResponseOptions<T>): MethodDecorator;
export function ApiResponse<T>(
  entityOrOptions: Type<T> | ApiResponseOptions<T>,
  rawOptions?: Omit<ApiResponseOptions<T>, 'type'>,
): MethodDecorator {
  const options: ApiResponseOptions<T> =
    typeof entityOrOptions === 'function'
      ? { type: entityOrOptions, ...rawOptions }
      : entityOrOptions;

  return (target, propertyKey, descriptor) => {
    const httpMethod = detectHttpMethod(target, propertyKey);
    applySwaggerDecorators(target, propertyKey, descriptor, options, httpMethod);
  };
}

/**
 * Class-level decorator that auto-applies response metadata to CRUD methods.
 *
 * Detects the HTTP method on each controller method and applies the appropriate
 * success response with the entity schema. Error responses are configured per-operation.
 *
 * @example
 * ```ts
 * @CrudApi(User, {
 *   create: { errors: { conflict: 'Email already exists' } },
 *   findOne: { errors: { notFound: 'User not found' } },
 *   update: { errors: { notFound: 'User not found', conflict: 'Duplicate email' } },
 *   delete: { errors: { notFound: 'User not found' } },
 * })
 * @Controller('users')
 * export class UsersController {
 *   @Get()
 *   findAll(@Query() q: FindDto) {}       // auto: 200 { data: User[] }
 *
 *   @Get(':id')
 *   findOne(@Param('id') id: string) {}   // auto: 200 { data: User }, 404
 *
 *   @Post()
 *   create(@Body() dto: CreateUserDto) {} // auto: 201 { data: User }, 409
 *
 *   @Patch(':id')
 *   update(@Param('id') id: string) {}    // auto: 200 { data: User }, 404, 409
 *
 *   @Delete(':id')
 *   remove(@Param('id') id: string) {}    // auto: 204, 404
 * }
 * ```
 *
 * Individual methods can override by applying `@ApiResponse` directly — the
 * method-level decorator runs after the class decorator and takes precedence.
 *
 * Gracefully no-ops when `@nestjs/swagger` is not installed.
 *
 * @param entity  - The entity class used for response schemas.
 * @param options - Per-operation error configuration.
 */
export function CrudApi<T>(entity: Type<T>, options?: CrudApiOptions): ClassDecorator {
  return (target) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const proto: Record<string, unknown> = target.prototype;
    const ownKeys = Object.getOwnPropertyNames(proto).filter(
      (key) => key !== 'constructor' && typeof proto[key] === 'function',
    );

    const operationMethodMap: Record<string, string> = {
      findAll: 'get',
      find: 'get',
      create: 'post',
      findOne: 'get',
      update: 'patch',
      delete: 'delete',
      remove: 'delete',
      destroy: 'delete',
    };

    /** Maps method names to CrudApiOptions keys (e.g. 'remove' → 'delete'). */
    const methodToConfigKey: Record<string, keyof CrudApiOptions> = {
      findAll: 'findAll',
      find: 'findAll',
      create: 'create',
      findOne: 'findOne',
      update: 'update',
      delete: 'delete',
      remove: 'delete',
      destroy: 'delete',
    };

    const defaultModes: Record<string, ApiResponseOptions<unknown>['mode']> = {
      findAll: 'list',
    };

    for (const operationKey of ownKeys) {
      const expectedMethod = operationMethodMap[operationKey];
      if (!expectedMethod) continue;

      const actualMethod = detectHttpMethod(proto, operationKey);
      if (!actualMethod || actualMethod !== expectedMethod) continue;

      const configKey = methodToConfigKey[operationKey] ?? (operationKey as keyof CrudApiOptions);
      const operationConfig = options?.[configKey];
      const operationErrors =
        operationConfig && 'errors' in operationConfig ? operationConfig.errors : undefined;
      const operationMode =
        operationConfig && 'mode' in operationConfig
          ? operationConfig.mode
          : defaultModes[operationKey];

      const decorator = ApiResponse({
        type: entity,
        mode: operationMode,
        errors: operationErrors,
      });

      const descriptor = Object.getOwnPropertyDescriptor(proto, operationKey);
      if (descriptor) {
        decorator(proto, operationKey, descriptor);
      }
    }
  };
}
