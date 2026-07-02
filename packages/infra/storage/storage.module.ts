import { type DynamicModule, type Provider, Module } from '@nestjs/common';
import { STORAGE_MODULE_OPTIONS } from './storage.constants';
import { StorageManager } from './manager/manager';
import type { StorageModuleOptions, StorageModuleAsyncOptions } from './storage.types';

/**
 * NestJS `DynamicModule` for file storage.
 *
 * Registers a `StorageManager` provider that can be injected anywhere
 * in the application. All configured disks are initialised during
 * module initialisation (before the first request).
 *
 * @example
 * ```typescript
 * import { StorageModule } from '@os.io/nest-kit/infra/storage';
 *
 * @Module({
 *   imports: [
 *     StorageModule.forRoot({
 *       disks: {
 *         uploads: {
 *           driver: 'local',
 *           root: './uploads',
 *           baseUrl: '/uploads',
 *         },
 *       },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class StorageModule {
  /**
   * Configure storage synchronously.
   */
  static forRoot(options: StorageModuleOptions): DynamicModule {
    return {
      module: StorageModule,
      global: true,
      providers: StorageModule.createProviders(options),
      exports: [StorageManager],
    };
  }

  /**
   * Configure storage asynchronously (e.g. from `ConfigService`).
   *
   * @example
   * ```typescript
   * StorageModule.forRootAsync({
   *   imports: [ConfigModule],
   *   inject: [ConfigService],
   *   useFactory: (config: ConfigService) => ({
   *     disks: config.get('storage.disks'),
   *     defaultDisk: config.get('storage.defaultDisk'),
   *   }),
   * })
   * ```
   */
  static forRootAsync(options: StorageModuleAsyncOptions): DynamicModule {
    return {
      module: StorageModule,
      global: options.global ?? true,
      imports: (options.imports as DynamicModule['imports']) ?? [],
      providers: StorageModule.createAsyncProviders(options),
      exports: [StorageManager],
    };
  }

  private static createProviders(options: StorageModuleOptions): Provider[] {
    return [
      { provide: STORAGE_MODULE_OPTIONS, useValue: options },
      {
        provide: StorageManager,
        useFactory: async (opts: StorageModuleOptions) => StorageManager.create(opts),
        inject: [STORAGE_MODULE_OPTIONS],
      },
    ];
  }

  private static createAsyncProviders(options: StorageModuleAsyncOptions): Provider[] {
    return [
      {
        provide: STORAGE_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
      {
        provide: StorageManager,
        useFactory: async (opts: StorageModuleOptions) => StorageManager.create(opts),
        inject: [STORAGE_MODULE_OPTIONS],
      },
    ];
  }
}
