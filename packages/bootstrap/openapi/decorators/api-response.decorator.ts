import type { Type } from '@nestjs/common';
import {
  getSchemaPath,
  ApiExtraModels,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiUnprocessableEntityResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

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

type DecoratorFactory = (options: Record<string, any>) => MethodDecorator;

const ERROR_DECORATORS: Record<ErrorDecoratorName, DecoratorFactory> = {
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiUnprocessableEntityResponse,
  ApiTooManyRequestsResponse,
};

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
function singleSchema(entity: Type<unknown>): Record<string, unknown> {
  return {
    schema: {
      type: 'object',
      properties: {
        data: { $ref: getSchemaPath(entity) },
      },
      required: ['data'],
    },
  };
}

/**
 * Build a response schema for an array wrapped in `{ data: T[] }`.
 */
function listSchema(entity: Type<unknown>): Record<string, unknown> {
  return {
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(entity) },
        },
      },
      required: ['data'],
    },
  };
}

/**
 * Build a paged response schema: `{ data: T[], total, page, limit }`.
 */
function pagedSchema(entity: Type<unknown>): Record<string, unknown> {
  return {
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: getSchemaPath(entity) } },
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
function offsetSchema(entity: Type<unknown>): Record<string, unknown> {
  return {
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: getSchemaPath(entity) } },
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
function cursorSchema(entity: Type<unknown>): Record<string, unknown> {
  return {
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: getSchemaPath(entity) } },
        nextCursor: { type: 'string', nullable: true },
        hasMore: { type: 'boolean' },
      },
      required: ['data', 'hasMore'],
    },
  };
}

/**
 * Apply success + error response decorators to a method.
 */
function applySwaggerDecorators(
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
  options: ApiResponseOptions<unknown>,
  httpMethod?: string,
): void {
  ApiExtraModels(options.type)(target, propertyKey, descriptor);

  const mode = options.mode ?? 'single';

  let responseDecorator: DecoratorFactory;
  let schema: Record<string, unknown>;

  const explicitStatus = options.status;
  const effectiveMethod =
    httpMethod ??
    (explicitStatus === 201 ? 'post' : explicitStatus === 204 ? 'delete' : (httpMethod ?? 'get'));

  switch (effectiveMethod) {
    case 'delete':
      responseDecorator = ApiNoContentResponse;
      schema = {};
      break;
    case 'post':
      responseDecorator = ApiCreatedResponse;
      schema = mode === 'single' ? singleSchema(options.type) : listSchema(options.type);
      break;
    default:
      responseDecorator = ApiOkResponse;
      switch (mode) {
        case 'list':
          schema = listSchema(options.type);
          break;
        case 'paged':
          schema = pagedSchema(options.type);
          break;
        case 'offset':
          schema = offsetSchema(options.type);
          break;
        case 'cursor':
          schema = cursorSchema(options.type);
          break;
        default:
          schema = singleSchema(options.type);
          break;
      }
      break;
  }

  const status = options.status ?? DEFAULT_STATUS[effectiveMethod] ?? 200;
  const description = options.description ?? '';

  responseDecorator({ status, description, ...schema })(target, propertyKey, descriptor);

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
        ERROR_DECORATORS[mapping.decorator]({ description: msg })(target, propertyKey, descriptor);
      }
    }
  }
}

/**
 * Detect the HTTP method of a controller method from NestJS metadata.
 *
 * @param target      - The class prototype.
 * @param propertyKey - The method name.
 * @returns The lowercase HTTP method or `undefined`.
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
 * Automatically detects the HTTP method and applies the appropriate success response.
 *
 * @example
 * ```ts
 * @Get(':id')
 * @ApiResponse(User, { errors: { notFound: 'User not found' } })
 * findOne(@Param('id') id: string) {}
 * ```
 *
 * @param options - Response configuration including entity, mode, and errors.
 */
/** Shorthand: entity only — defaults to single mode. */
export function ApiResponse<T>(entity: Type<T>): MethodDecorator;
/** Shorthand: entity + partial options. */
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
 * @example
 * ```ts
 * @CrudApi(User, {
 *   create: { errors: { conflict: 'Email already exists' } },
 *   findOne: { errors: { notFound: 'User not found' } },
 * })
 * @Controller('users')
 * export class UsersController { ... }
 * ```
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
