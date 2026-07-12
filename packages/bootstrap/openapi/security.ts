import type { SwaggerCustomOptions, SwaggerDocumentOptions } from '@nestjs/swagger';
import type { NestJSReferenceConfiguration } from '@scalar/nestjs-api-reference';
import type { DocumentBuilder } from '@nestjs/swagger';

/**
 * Well-known security scheme presets.
 *
 * Each preset provides sensible default `SecuritySchemeObject` fields
 * that can be overridden via `options`.
 *
 * - `'bearer'` — `{ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }`
 * - `'basic'` — `{ type: 'http', scheme: 'basic' }`
 * - `'oauth2'` — `{ type: 'oauth2', flows: {} }`
 * - `'apikey'` — `{ type: 'apiKey', in: 'header' }`
 * - `'cookie'` — `{ type: 'apiKey', in: 'cookie' }`
 */
export type SecuritySchemePreset = 'bearer' | 'basic' | 'oauth2' | 'apikey' | 'cookie';

/**
 * Describes a single security scheme to register on the OpenAPI document.
 *
 * Mirrors `DocumentBuilder.addSecurity(name, options)` with an optional
 * `preset` that fills in default values for common scheme types.
 */
export interface SecurityMethod {
  /** Key of the security scheme in the OpenAPI spec. */
  name: string;
  /**
   * Optional preset that fills default `SecuritySchemeObject` fields.
   * Fields provided in `options` override the preset defaults.
   */
  preset?: SecuritySchemePreset;
  /**
   * `SecuritySchemeObject` fields.
   * When a `preset` is set, these are merged on top of the defaults.
   */
  options?: Record<string, unknown>;
}

/**
 * Shared options for OpenAPI / Swagger / Scalar doc configuration.
 *
 * Since `@nestjs/swagger` is required, the Swagger-specific types
 * (`SwaggerDocumentOptions`, `SwaggerCustomOptions`) are used directly.
 * Scalar-specific options are kept as `Record<string, unknown>` because
 * `@scalar/nestjs-api-reference` is optional.
 */
export interface OpenApiOptions {
  /** API title rendered in the documentation UI. */
  title?: string;
  /** API description rendered in the documentation UI. */
  description?: string;
  /** API version string. */
  version?: string;
  /**
   * Route path for the API documentation UI.
   *
   * **Must NOT** start with a leading `/` — the library prepends it automatically.
   *
   * @example 'api/docs'
   */
  path?: string;
  /**
   * Security methods to register on the OpenAPI document.
   *
   * Defaults to `[{ type: 'bearer' }]` when omitted.
   * Pass an empty array to disable all security schemes.
   */
  securityMethods?: SecurityMethod[];
  /** Options passed to `SwaggerModule.setup()` for Swagger UI. */
  swaggerCustomOptions?: SwaggerCustomOptions;
  /** Options passed to `SwaggerModule.createDocument()`. */
  swaggerDocumentOptions?: SwaggerDocumentOptions;
  /** Options passed to `@scalar/nestjs-api-reference` (only used when Scalar is available). */
  scalarOptions?: NestJSReferenceConfiguration;
}

// ── Internal ───────────────────────────────────────────────────

const SECURITY_PRESETS: Record<string, Record<string, unknown>> = {
  bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
  basic: { type: 'http', scheme: 'basic' },
  oauth2: { type: 'oauth2', flows: {} },
  apikey: { type: 'apiKey', in: 'header' },
  cookie: { type: 'apiKey', in: 'cookie' },
};

/**
 * Apply security methods to a `DocumentBuilder` instance.
 *
 * When `methods` is `undefined`, defaults to `addBearerAuth()`.
 * When `methods` is an empty array, no security schemes are added.
 *
 * @param builder - The `DocumentBuilder` to configure.
 * @param methods - Security method descriptors to apply.
 */
export function applySecurity(builder: DocumentBuilder, methods?: SecurityMethod[]): void {
  if (methods === undefined) {
    builder.addBearerAuth();
    return;
  }

  for (const { name, preset, options } of methods) {
    const defaults = preset ? SECURITY_PRESETS[preset] : undefined;
    builder.addSecurity(name, { ...defaults, ...options } as never);
  }
}
