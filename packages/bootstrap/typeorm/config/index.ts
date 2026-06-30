import { type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

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

interface EnvReader {
  str: (key: string) => string | undefined;
  num: (key: string) => number | undefined;
  bool: (key: string, def: boolean) => boolean;
}

function buildConfig(get: EnvReader, options?: TypeOrmConfigOptions): TypeOrmModuleOptions {
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

/* ---------- for TypeOrmModule.forRoot (reads process.env) ---------- */

export function configTypeOrm(options?: TypeOrmConfigOptions): TypeOrmModuleOptions {
  return buildConfig(
    {
      str: (key) => process.env[key],
      num: (key) => (process.env[key] !== undefined ? Number(process.env[key]) : undefined),
      bool: (key, def) =>
        process.env[key] !== undefined
          ? process.env[key] === 'true' || process.env[key] === '1'
          : def,
    },
    options,
  );
}

/* ---------- for TypeOrmModule.forRootAsync (uses ConfigService) ---------- */

export function configTypeOrmAsync(
  configService: ConfigService,
  options?: TypeOrmConfigOptions,
): TypeOrmModuleOptions {
  return buildConfig(
    {
      str: (key) => configService.get<string>(key),
      num: (key) => configService.get<number>(key),
      bool: (key, def) => configService.get<boolean>(key, def) ?? def,
    },
    options,
  );
}
