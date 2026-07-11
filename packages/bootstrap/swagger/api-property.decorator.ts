import type { Type } from '@nestjs/common';
import { getSwagger } from './swagger.helper.js';

// ── Example generators ─────────────────────────────────────────

/**
 * Resolved example values for common OpenAPI formats.
 *
 * Each entry maps a format string to a realistic example value
 * that will be used when the user does not provide an explicit `example`.
 */
const FORMAT_EXAMPLES: Record<string, unknown> = {
  // ── String formats ────────────────────────────────────────────
  uuid: '550e8400-e29b-41d4-a716-446655440000',
  email: 'user@example.com',
  'idn-email': 'user@example.com',
  date: '2024-01-15',
  'date-time': '2024-01-15T10:30:00.000Z',
  time: '10:30:00',
  duration: 'P3Y6M4DT12H30M5S',
  uri: 'https://example.com',
  url: 'https://example.com',
  'uri-reference': '/api/v1/users',
  hostname: 'example.com',
  'idn-hostname': 'example.com',
  ipv4: '192.168.1.1',
  ipv6: '2001:db8::1',
  password: '********',
  binary: 'SGVsbG8sIFdvcmxkIQ==',
  byte: 'SGVsbG8sIFdvcmxkIQ==',

  // ── Number formats ───────────────────────────────────────────
  float: 1.5,
  double: 1.5,

  // ── Payment / financial formats ───────────────────────────────
  money: '1,234.56',
  decimal: '1,234.56',
  currency: 'USD',
  percentage: 75.5,
  'credit-card': '4242 4242 4242 4242',
  'card-number': '4242 4242 4242 4242',
  cvv: '123',
  iban: 'DE89 3704 0044 0532 0130 00',
  swift: 'DEUTDEFF',
  bic: 'DEUTDEFF',
  'tax-id': '123-45-6789',
  phone: '+1-234-567-8900',
};

/** Default example when type is `String` and no format is specified. */
const STRING_DEFAULT = 'string';

/** Default example when type is `Number` and no format is specified. */
const NUMBER_DEFAULT = 1;

/**
 * Auto-detect the OpenAPI type string from a constructor or type reference.
 *
 * `'string'`, `'number'`, `'boolean'` are returned as-is.
 * Constructors like `String`, `Number`, `Boolean` are mapped to their
 * OpenAPI equivalents.
 */
function normalizeType(type: Type<unknown> | string | undefined): string | undefined {
  if (!type) return undefined;
  if (typeof type === 'string') return type;

  switch (type) {
    case String:
      return 'string';
    case Number:
      return 'number';
    case Boolean:
      return 'boolean';
    default:
      return undefined;
  }
}

/**
 * Resolve an example value based on the declared `type` and `format`.
 *
 * @param type   - The declared property type (`String`, `Number`, `Boolean`, or string literal).
 * @param format - The OpenAPI format (e.g. `'uuid'`, `'email'`, `'money'`).
 * @returns A realistic example value, or `undefined` if the type is not recognized.
 */
export function resolveExample(type: Type<unknown> | string | undefined, format?: string): unknown {
  const normalized = normalizeType(type);

  // Explicit format takes priority when it's a known format
  if (format && FORMAT_EXAMPLES[format] !== undefined) {
    return FORMAT_EXAMPLES[format];
  }

  switch (normalized) {
    case 'string':
      return STRING_DEFAULT;
    case 'number':
      return NUMBER_DEFAULT;
    case 'boolean':
      return true;
    default:
      return undefined;
  }
}

// ── Decorator options ──────────────────────────────────────────

/** Shared options accepted by all parameter/body decorators. */
interface BaseOptions {
  /** Description shown in Swagger UI. */
  description?: string;
  /** Whether the parameter is required. Defaults vary by decorator. */
  required?: boolean;
  /** Deprecation flag. */
  deprecated?: boolean;
  /** Example value — overrides auto-generated example when provided. */
  example?: unknown;
  /** Explicit example values keyed by name. */
  examples?: Record<string, unknown>;
}

/** Options for the {@link ApiParam} decorator. */
export interface ApiParamDecoratorOptions extends BaseOptions {
  /** Parameter name. */
  name: string;
  /** Parameter type — constructor or string literal. */
  type?: Type<unknown> | string;
  /** OpenAPI format (e.g. `'uuid'`, `'money'`, `'email'`). */
  format?: string;
  /** Whether this parameter is an array. */
  isArray?: boolean;
  /** Enum values. */
  enum?: unknown[];
  /** Enum name for Swagger UI rendering. */
  enumName?: string;
}

/** Options for the {@link ApiQuery} decorator. */
export interface ApiQueryDecoratorOptions extends BaseOptions {
  /** Query parameter name. */
  name: string;
  /** Parameter type — constructor or string literal. */
  type?: Type<unknown> | string;
  /** OpenAPI format (e.g. `'uuid'`, `'money'`, `'email'`). */
  format?: string;
  /** Whether this parameter is an array. */
  isArray?: boolean;
  /** Enum values. */
  enum?: unknown[];
  /** Enum name for Swagger UI rendering. */
  enumName?: string;
}

/** Options for the {@link ApiProperty} decorator. */
export interface ApiPropertyDecoratorOptions extends BaseOptions {
  /** Property type — constructor or string literal. */
  type?: Type<unknown> | string;
  /** OpenAPI format (e.g. `'uuid'`, `'money'`, `'email'`). */
  format?: string;
  /** Whether this property is an array. */
  isArray?: boolean;
  /** Enum values. */
  enum?: unknown[];
  /** Enum name for Swagger UI rendering. */
  enumName?: string;
  /** Default value. */
  default?: unknown;
  /** Whether the property is read-only. */
  readOnly?: boolean;
  /** Whether the property is write-only. */
  writeOnly?: boolean;
  /** Whether the property is nullable. */
  nullable?: boolean;
  /** Minimum value (for numbers). */
  minimum?: number;
  /** Maximum value (for numbers). */
  maximum?: number;
  /** Minimum string length. */
  minLength?: number;
  /** Maximum string length. */
  maxLength?: number;
  /** Regex pattern. */
  pattern?: string;
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Decorator that documents a path parameter with auto-generated example.
 *
 * Extends `@nestjs/swagger`'s `@ApiParam` by auto-injecting an `example`
 * value based on the declared `type` and `format` when the user does not
 * provide one explicitly.
 *
 * @example
 * ```ts
 * @ApiParam({ name: 'id', type: String, format: 'uuid' })
 * // → example: '550e8400-e29b-41d4-a716-446655440000'
 *
 * @ApiParam({ name: 'amount', type: Number, format: 'money' })
 * // → example: '1,234.56'
 * ```
 *
 * Gracefully no-ops when `@nestjs/swagger` is not installed.
 *
 * @param options - Parameter configuration.
 */
export function ApiParam(options: ApiParamDecoratorOptions): MethodDecorator & ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (...args: [object, string | symbol, PropertyDescriptor] | [Function]) => {
    const s = getSwagger();
    if (!s) return;

    const example = options.example ?? resolveExample(options.type, options.format);
    s.ApiParam({ ...options, example })(...(args as [object, string | symbol, PropertyDescriptor]));
  };
}

/**
 * Decorator that documents a query parameter with auto-generated example.
 *
 * Extends `@nestjs/swagger`'s `@ApiQuery` by auto-injecting an `example`
 * value based on the declared `type` and `format`.
 *
 * @example
 * ```ts
 * @ApiQuery({ name: 'page', type: Number })
 * // → example: 1
 *
 * @ApiQuery({ name: 'email', type: String, format: 'email' })
 * // → example: 'user@example.com'
 * ```
 *
 * Gracefully no-ops when `@nestjs/swagger` is not installed.
 *
 * @param options - Query parameter configuration.
 */
export function ApiQuery(options: ApiQueryDecoratorOptions): MethodDecorator & ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (...args: [object, string | symbol, PropertyDescriptor] | [Function]) => {
    const s = getSwagger();
    if (!s) return;

    const example = options.example ?? resolveExample(options.type, options.format);
    s.ApiQuery({ ...options, example })(...(args as [object, string | symbol, PropertyDescriptor]));
  };
}

/**
 * Decorator that documents a DTO property with auto-generated example.
 *
 * Extends `@nestjs/swagger`'s `@ApiProperty` with two additions:
 *
 * 1. **Auto-example** — injects a realistic `example` value based on
 *    `type` and `format` when none is provided.
 * 2. **Default `required: false`** — makes it a drop-in replacement for
 *    `@ApiPropertyOptional`.
 *
 * @example
 * ```ts
 * class CreateUserDto {
 *   @ApiProperty({ type: String, format: 'uuid' })
 *   id: string;                          // example: '550e8400-...'
 *
 *   @ApiProperty({ type: String, format: 'email' })
 *   email: string;                       // example: 'user@example.com'
 *
 *   @ApiProperty({ type: Number, format: 'money' })
 *   amount: string;                      // example: '1,234.56'
 *
 *   @ApiProperty({ type: Boolean })
 *   active: boolean;                     // example: true
 * }
 * ```
 *
 * Gracefully no-ops when `@nestjs/swagger` is not installed.
 *
 * @param options - Property configuration.
 */
export function ApiProperty(options?: ApiPropertyDecoratorOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const s = getSwagger();
    if (!s) return;

    const example = options?.example ?? resolveExample(options?.type, options?.format);
    s.ApiProperty({ ...options, example, required: false })(target, propertyKey);
  };
}

/**
 * Re-export of `@nestjs/swagger`'s `@ApiBody` decorator.
 *
 * Body documentation typically uses a DTO class, so auto-example generation
 * is not applicable. This is a direct pass-through.
 */
export function ApiBody(options: Record<string, unknown>): MethodDecorator {
  return (...args: [object, string | symbol, PropertyDescriptor]) => {
    const s = getSwagger();
    if (!s) return;

    s.ApiBody(options)(...args);
  };
}
