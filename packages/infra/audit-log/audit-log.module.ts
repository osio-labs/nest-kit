import { type DynamicModule, type Provider, Module, Global } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { AUDIT_LOG_MODULE_OPTIONS, AUDIT_LOG_REPOSITORY } from './audit-log.constants';
import { AuditLogService } from './audit-log.service';
import type { AuditLogModuleOptions, AuditLogModuleAsyncOptions } from './audit-log.types';
import { AuditLogEntity } from './audit-log.entity';
import { createTypeOrmAuditLogRepository } from './adapters/typeorm.adapter';

/**
 * NestJS `DynamicModule` for audit-log tracking.
 *
 * Records user actions (create, update, delete, login, …) with context
 * such as IP, user-agent, resource changes, and organization scoping.
 *
 * ## TypeORM mode (default)
 *
 * ```typescript
 * import { AuditLogModule } from '@os.io/nest-kit/infra/audit-log';
 *
 * @Module({
 *   imports: [AuditLogModule.forRoot()],
 * })
 * export class AppModule {}
 * ```
 *
 * ## Custom repository mode
 * Provide any backend by passing a `repository` that implements
 * {@link AuditLogRepository}:
 *
 * ```typescript
 * import { AuditLogModule } from '@os.io/nest-kit/infra/audit-log';
 *
 * @Module({
 *   imports: [AuditLogModule.forRoot({ repository: myRepo })],
 * })
 * export class AppModule {}
 * ```
 *
 * ## TypeORM disabled mode
 * When you want full control over the backend without any TypeORM dependency,
 * set `typeorm: { enabled: false }` and provide your own `repository`:
 *
 * ```typescript
 * import { AuditLogModule } from '@os.io/nest-kit/infra/audit-log';
 *
 * @Module({
 *   imports: [AuditLogModule.forRoot({
 *     typeorm: { enabled: false },
 *     repository: myRepo,
 *   })],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class AuditLogModule {
  /**
   * Register the TypeORM entity and repository provider.
   * Must be imported before `forRoot()` when using the TypeORM backend.
   *
   * @param connection  Optional TypeORM connection name (defaults to the default connection).
   */
  static forFeature(connection?: string): DynamicModule {
    return {
      module: AuditLogModule,
      imports: [AuditLogModule.loadTypeOrmFeature(connection)],
      providers: [
        {
          provide: AUDIT_LOG_REPOSITORY,
          useFactory: (repo: Repository<AuditLogEntity>) => createTypeOrmAuditLogRepository(repo),
          inject: [AuditLogModule.getRepositoryToken(connection)],
        },
      ],
      exports: [AUDIT_LOG_REPOSITORY],
    };
  }

  /**
   * Configure the audit-log module synchronously.
   *
   * @param options  When a `repository` is provided it is used as-is.
   *                 Otherwise, the built-in TypeORM repository is used.
   */
  static forRoot(options?: AuditLogModuleOptions): DynamicModule {
    const resolvedOptions: AuditLogModuleOptions = {
      captureRequestContext: true,
      ...options,
    };

    const typeormEnabled = resolvedOptions.typeorm?.enabled ?? true;

    const providers: Provider[] = [
      { provide: AUDIT_LOG_MODULE_OPTIONS, useValue: resolvedOptions },
      AuditLogService,
    ];

    if (resolvedOptions.repository) {
      providers.push({ provide: AUDIT_LOG_REPOSITORY, useValue: resolvedOptions.repository });
    }

    if (typeormEnabled && !resolvedOptions.repository) {
      return {
        module: AuditLogModule,
        global: resolvedOptions.global ?? true,
        imports: [AuditLogModule.loadTypeOrmFeature()],
        providers: [
          ...providers,
          {
            provide: AUDIT_LOG_REPOSITORY,
            useFactory: (repo: Repository<AuditLogEntity>) => createTypeOrmAuditLogRepository(repo),
            inject: [AuditLogModule.getRepositoryToken()],
          },
        ],
        exports: [AuditLogService],
      };
    }

    return {
      module: AuditLogModule,
      global: resolvedOptions.global ?? true,
      providers,
      exports: [AuditLogService],
    };
  }

  /**
   * Configure the audit-log module asynchronously.
   */
  static forRootAsync(options: AuditLogModuleAsyncOptions): DynamicModule {
    return {
      module: AuditLogModule,
      global: options.global ?? true,
      imports: options.imports ?? [],
      providers: AuditLogModule.createAsyncProviders(options),
      exports: [AuditLogService],
    };
  }

  private static createAsyncProviders(options: AuditLogModuleAsyncOptions): Provider[] {
    const asyncOptionsProvider: Provider = {
      provide: AUDIT_LOG_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };

    return [
      asyncOptionsProvider,
      {
        provide: AUDIT_LOG_REPOSITORY,
        useFactory: (opts: AuditLogModuleOptions) => {
          if (opts.repository) return opts.repository;
          throw new Error(
            'When using forRootAsync() with AuditLogModule, you must either:\n' +
              '  1. Provide a `repository` in the options returned by useFactory, or\n' +
              '  2. Import AuditLogModule.forFeature() before forRootAsync().',
          );
        },
        inject: [AUDIT_LOG_MODULE_OPTIONS],
      },
      AuditLogService,
    ];
  }

  private static loadTypeOrmFeature(connection?: string): any {
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
    try {
      const { TypeOrmModule } = require('@nestjs/typeorm');
      const entities = [AuditLogEntity];
      return connection
        ? TypeOrmModule.forFeature(entities, connection)
        : TypeOrmModule.forFeature(entities);
    } catch {
      throw new Error(
        'Cannot find module "@nestjs/typeorm".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install @nestjs/typeorm\n',
      );
    }
    /* eslint-enable */
  }

  private static getRepositoryToken(connection?: string): any {
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
    try {
      const { getRepositoryToken } = require('@nestjs/typeorm');
      return getRepositoryToken(AuditLogEntity, connection);
    } catch {
      return `${AuditLogEntity.name}Repository`;
    }
    /* eslint-enable */
  }
}
