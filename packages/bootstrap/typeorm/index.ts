/**
 * @os.io/nest-kit/bootstrap/typeorm
 *
 * TypeORM configuration, CRUD factories, and Unit of Work support for NestJS applications.
 *
 * ## Sub-modules
 *
 * - `config` — `configTypeOrm` for connection setup (env or ConfigService)
 * - `crud` — `createCrudService` / `createCrudController` for generic REST endpoints
 * - `uow` — `UnitOfWork`, `@Transactional()`, `@TransactionalController()`
 * - `decorators` — `@HalfUnique()`, `@SoftDelete()`, `@Money()`, `@Slug()`, `@UniqueCode()`, `@SequenceId()`
 *
 * @module
 * @packageDocumentation
 */

import { type TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { Getter } from '../with-config.js';
import { withConfig } from '../with-config.js';

export interface TypeOrmConfigOptions {
  schema?: string;
  poolSize?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
  statementTimeoutMs?: number;
}

const DEFAULTS: Partial<
  Record<Required<TypeOrmModuleOptions>['type'], { port: number; database: string }>
> = {
  postgres: { port: 5432, database: 'postgres' },
  mysql: { port: 3306, database: 'mysql' },
  mariadb: { port: 3306, database: 'mysql' },
  'better-sqlite3': { port: 0, database: ':memory:' },
};

function buildConfig(get: Getter, options?: TypeOrmConfigOptions): TypeOrmModuleOptions {
  const defaults =
    DEFAULTS[(get.str('DB_TYPE') as Required<TypeOrmModuleOptions>['type']) ?? 'postgres'];

  return {
    type: get.str('DB_TYPE') ?? 'postgres',
    host: get.str('DB_HOST') ?? 'localhost',
    port: get.num('DB_PORT') ?? defaults?.port ?? 5432,
    username: get.str('DB_USERNAME'),
    password: get.str('DB_PASSWORD'),
    database: get.str('DB_DATABASE') ?? defaults?.database ?? 'database',
    synchronize: get.bool('DB_SYNCHRONIZE', false),
    logging: get.bool('DB_LOGGING', false) ? ('all' as const) : false,
    autoLoadEntities: true,
    retryAttempts: 10,
    retryDelay: 3000,
    ...(get.bool('DB_RDS_ENABLED', false) || get.bool('DB_SSL_REJECT_UNAUTHORIZED', false)
      ? { ssl: { rejectUnauthorized: true } }
      : {}),
    ...(get.bool('DB_RDS_ENABLED', false)
      ? {
          extra: {
            ssl: { rejectUnauthorized: true },
            max: options?.poolSize ?? 20,
            idleTimeoutMillis: options?.idleTimeoutMs ?? 30000,
            connectionTimeoutMillis: options?.connectionTimeoutMs ?? 10000,
            ...(options?.statementTimeoutMs !== undefined
              ? { statement_timeout: options.statementTimeoutMs }
              : {}),
            ...(options?.schema ? { schema: options.schema } : {}),
            ...(get.bool('RDS_USE_IAM', false)
              ? { region: get.str('RDS_REGION') ?? 'us-east-1' }
              : {}),
          },
        }
      : {}),
    ...(options?.schema && !get.bool('DB_RDS_ENABLED', false) ? { schema: options.schema } : {}),
  } as TypeOrmModuleOptions;
}

/**
 * Build TypeORM connection options from environment variables or ConfigService.
 *
 * When `configService` is provided, reads from it (which internally may read
 * `process.env` by default). Otherwise reads directly from `process.env`.
 *
 * @param options - Optional overrides (schema, pool size, timeouts).
 * @param configService - Optional ConfigService (for `forRootAsync` pattern).
 *
 * @example
 * ```ts
 * // Sync — reads process.env
 * TypeOrmModule.forRoot(configTypeOrm())
 *
 * // Async — uses ConfigService
 * TypeOrmModule.forRootAsync({
 *   useFactory: (cs) => configTypeOrm({ schema: 'my' }, cs),
 *   inject: [ConfigService],
 * })
 * ```
 */
export const configTypeOrm = withConfig<TypeOrmConfigOptions, TypeOrmModuleOptions>(buildConfig);

export * from './crud/index.js';
export * from './uow/index.js';
export * from './decorators/index.js';
export * from './dto/index.js';

/** @internal */
let _TypeOrmDataSourceModule: unknown;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('typeorm');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@nestjs/typeorm');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _TypeOrmDataSourceModule = (require('./data-source.module.js') as Record<string, unknown>)
    .TypeOrmDataSourceModule;
} catch {
  /* typeorm or @nestjs/typeorm not installed — TypeOrmDataSourceModule will be undefined */
}

/**
 * NestJS module that auto-registers the TypeORM `DataSource`
 * for decorators that need database access inside lifecycle hooks.
 *
 * Only available when `typeorm` and `@nestjs/typeorm` are installed.
 */
export const TypeOrmDataSourceModule = _TypeOrmDataSourceModule as
  (new (...args: unknown[]) => object) | undefined;
