import { type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import type { ConfigReader } from '../../shared';
import { fromEnv } from '../../shared';

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

function buildConfig(get: ConfigReader, options?: TypeOrmConfigOptions): TypeOrmModuleOptions {
  const defaults = DEFAULTS[(get.str('DB_TYPE') ?? 'postgres') as keyof typeof DEFAULTS];

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

export function configTypeOrm(options?: TypeOrmConfigOptions): TypeOrmModuleOptions;
export function configTypeOrm(
  configService: ConfigService,
  options?: TypeOrmConfigOptions,
): TypeOrmModuleOptions;
export function configTypeOrm(
  configServiceOrOptions?: ConfigService | TypeOrmConfigOptions,
  options?: TypeOrmConfigOptions,
): TypeOrmModuleOptions {
  if (configServiceOrOptions && 'get' in configServiceOrOptions) {
    return buildConfig(fromEnv(configServiceOrOptions), options);
  }

  return buildConfig(fromEnv(), configServiceOrOptions);
}
