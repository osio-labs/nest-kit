/**
 * OpenAPI / Swagger / Scalar documentation helpers.
 *
 * Provides a unified `configOpenApi()` entry-point that auto-detects
 * whether `@scalar/nestjs-api-reference` is installed and falls back
 * to Swagger UI when it is not.
 *
 * Also exports enhanced decorator wrappers around `@nestjs/swagger`
 * that add auto-generated examples based on `type` + `format`.
 *
 * **Requires `@nestjs/swagger`** — importing this module without it
 * will throw a clear error at the top level.
 *
 * @example
 * ```ts
 * import { configOpenApi } from '@os.io/nest-kit/bootstrap/openapi';
 *
 * const app = await NestFactory.create(AppModule);
 * await configOpenApi(app, { title: 'My API', path: 'docs' });
 * ```
 *
 * @module
 * @packageDocumentation
 */

// ── Central @nestjs/swagger check ──────────────────────────────
import { createRequire } from 'node:module';
try {
  createRequire(import.meta.url).resolve('@nestjs/swagger');
} catch {
  throw new Error(
    '[@os.io/nest-kit] @nestjs/swagger is required when using the openapi module. Install: npm install @nestjs/swagger',
  );
}

// ── Config ─────────────────────────────────────────────────────
export { configOpenApi } from './config.js';

// ── Decorators ─────────────────────────────────────────────────
export {
  ApiResponse,
  CrudApi,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiProperty,
  ApiEndpoint,
  ApiPaginatedResponse,
  resolveExample,
} from './decorators/index.js';
export type {
  ApiResponseOptions,
  CrudApiOptions,
  ApiParamDecoratorOptions,
  ApiQueryDecoratorOptions,
  ApiPropertyDecoratorOptions,
  ApiEndpointOptions,
} from './decorators/index.js';
