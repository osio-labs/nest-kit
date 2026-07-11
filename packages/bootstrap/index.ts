/**
 * @os.io/nest-kit/bootstrap
 *
 * Helpers and configuration bootstrappers for popular NestJS modules.
 *
 * ## App config (main.ts)
 *
 * - `configOpenApi()` — Swagger / Scalar API docs
 * - `configValidation()` — ValidationPipe (normal / i18n)
 *
 * ## Module registration (app.module.ts)
 *
 * Re-exported from root barrel — only available when the corresponding
 * peer dependency is installed (otherwise `undefined`).
 *
 * | Export | Requires |
 * |---|---|
 * | `configTypeOrm`, CRUD, `UoW`, `@Transactional()`, `@HalfUnique()` | `typeorm`, `@nestjs/typeorm` |
 * | `@ApiResponse()`, `@CrudApi()` | `@nestjs/swagger` |
 * | `configCache` | `@nestjs/cache-manager`, `cache-manager` |
 * | `configQueue` | `@nestjs/bullmq`, `bullmq` |
 * | `configSentry`, `initSentry` | `@sentry/nestjs` |
 *
 * @module
 * @packageDocumentation
 */

/* Module registration — for app.module.ts */
export * from './typeorm';
export * from './swagger';
export * from './cache';
export * from './queue';
export * from './sentry';

/* App config — for main.ts */
export * from './openapi';
export * from './validation';
