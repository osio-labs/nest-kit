/**
 * @os.io/nest-kit/bootstrap
 *
 * Helpers and configuration bootstrappers for popular NestJS modules such as
 * Swagger, Scalar, Cache, TypeORM, Mongoose, etc. Designed to be called directly from
 * your application's `main.ts` or `app.module.ts`.
 *
 * ## Sub-modules
 *
 * - `@os.io/nest-kit/bootstrap/swagger`   — Swagger UI
 * - `@os.io/nest-kit/bootstrap/scalar`    — Scalar API Reference
 * - `@os.io/nest-kit/bootstrap/cache`     — CacheModule setup
 * - `@os.io/nest-kit/bootstrap/typeorm`   — TypeORM setup, CRUD factories, Unit of Work
 *
 * @module
 * @packageDocumentation
 */

export * from './swagger';
export * from './scalar';
