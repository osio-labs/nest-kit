import { type DynamicModule, type Provider, Module, Global } from '@nestjs/common';
import {
  NOTIFICATION_MODULE_OPTIONS,
  NOTIFICATION_QUEUE,
  NOTIFICATION_STORE,
} from './notification.constants.js';
import { NotificationService } from './notification.service.js';
import type {
  NotificationModuleOptions,
  NotificationModuleAsyncOptions,
} from './notification.types.js';

/**
 * NestJS `DynamicModule` for multi-channel notifications.
 *
 * Supports email, SMS, push, Telegram, and Slack with pluggable
 * providers and optional queuing (Bull) and persistence.
 *
 * ## Synchronous configuration
 *
 * ```typescript
 * import { NotificationModule } from '@os.io/nest-kit/infra/notification';
 *
 * @Module({
 *   imports: [
 *     NotificationModule.forRoot({
 *       providers: {
 *         email: [new SendGridEmailProvider({ apiKey: '…' })],
 *       },
 *       storage: { enabled: true, store: myStore },
 *       queue: { enabled: true, bull: myBullQueue },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * ## Async configuration
 *
 * ```typescript
 * NotificationModule.forRootAsync({
 *   useFactory: (config: ConfigService) => ({
 *     providers: { … },
 *   }),
 *   inject: [ConfigService],
 *   imports: [ConfigModule],
 * })
 * ```
 */
@Global()
@Module({})
export class NotificationModule {
  /**
   * Configure the notification module synchronously.
   */
  static forRoot(options: NotificationModuleOptions): DynamicModule {
    const providers: Provider[] = [
      { provide: NOTIFICATION_MODULE_OPTIONS, useValue: options },
      NotificationService,
    ];

    if (options.storage?.enabled && options.storage.store) {
      providers.push({ provide: NOTIFICATION_STORE, useValue: options.storage.store });
    }

    if (options.queue?.enabled && options.queue.bull) {
      providers.push({ provide: NOTIFICATION_QUEUE, useValue: options.queue.bull });
    }

    return {
      module: NotificationModule,
      global: options.global ?? true,
      providers,
      exports: [NotificationService],
    };
  }

  /**
   * Configure the notification module asynchronously.
   */
  static forRootAsync(options: NotificationModuleAsyncOptions): DynamicModule {
    return {
      module: NotificationModule,
      global: options.global ?? true,
      imports: (options.imports ?? []) as any[],
      providers: NotificationModule.createAsyncProviders(options),
      exports: [NotificationService],
    };
  }

  private static createAsyncProviders(options: NotificationModuleAsyncOptions): Provider[] {
    const asyncOptionsProvider: Provider = {
      provide: NOTIFICATION_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: (options.inject ?? []) as any[],
    };

    return [
      asyncOptionsProvider,
      {
        provide: NOTIFICATION_STORE,
        useFactory: (opts: NotificationModuleOptions) => {
          if (opts.storage?.enabled && opts.storage.store) return opts.storage.store;
          return undefined;
        },
        inject: [NOTIFICATION_MODULE_OPTIONS],
      },
      {
        provide: NOTIFICATION_QUEUE,
        useFactory: (opts: NotificationModuleOptions) => {
          if (opts.queue?.enabled && opts.queue.bull) return opts.queue.bull;
          return undefined;
        },
        inject: [NOTIFICATION_MODULE_OPTIONS],
      },
      NotificationService,
    ];
  }
}
