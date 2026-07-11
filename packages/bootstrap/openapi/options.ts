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
 * Uses local minimal shapes instead of importing from optional peer
 * dependencies so consumers never need `@nestjs/swagger` or
 * `@scalar/nestjs-api-reference` just for types.
 */
export interface OpenApiOptions {
  title?: string;
  description?: string;
  version?: string;
  path?: string;
  /**
   * Security methods to register on the OpenAPI document.
   *
   * Defaults to `[{ type: 'bearer' }]` when omitted.
   * Pass an empty array to disable all security schemes.
   */
  securityMethods?: SecurityMethod[];
  swaggerCustomOptions?: {
    customfavIcon?: string;
    swaggerOptions?: Record<string, unknown>;
  };
  swaggerDocumentOptions?: Record<string, unknown>;
  scalarOptions?: Record<string, unknown>;
}
