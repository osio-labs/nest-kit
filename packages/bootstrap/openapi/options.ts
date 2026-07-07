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
  swaggerCustomOptions?: {
    customfavIcon?: string;
    swaggerOptions?: Record<string, unknown>;
  };
  swaggerDocumentOptions?: Record<string, unknown>;
  scalarOptions?: Record<string, unknown>;
}
