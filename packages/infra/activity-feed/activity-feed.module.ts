import { type DynamicModule, type Provider, Module, Global } from '@nestjs/common';
import { ACTIVITY_FEED_MODULE_OPTIONS, ACTIVITY_FEED_STORE } from './activity-feed.constants.js';
import { ActivityFeedService } from './activity-feed.service.js';
import type {
  ActivityFeedModuleOptions,
  ActivityFeedModuleAsyncOptions,
} from './activity-feed.types.js';

/**
 * NestJS `DynamicModule` for activity feeds.
 *
 * Wraps any {@link ActivityFeedStore} and exposes a convenient
 * {@link ActivityFeedService} for recording activities, building
 * user feeds, and managing follow relationships.
 *
 * ## Synchronous setup
 *
 * ```typescript
 * import { ActivityFeedModule } from '@os.io/nest-kit/infra/activity-feed';
 * import { MemoryFeedStore } from '@os.io/nest-kit/infra/activity-feed/adapters';
 *
 * @Module({
 *   imports: [
 *     ActivityFeedModule.forRoot({ store: new MemoryFeedStore() }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * ## Async setup
 *
 * ```typescript
 * ActivityFeedModule.forRootAsync({
 *   useFactory: (config: ConfigService) => ({
 *     store: new RedisFeedStore({ url: config.get('REDIS_URL') }),
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Global()
@Module({})
export class ActivityFeedModule {
  /**
   * Configure the activity-feed module synchronously.
   *
   * @param options  Store instance and optional configuration.
   */
  static forRoot(options: ActivityFeedModuleOptions): DynamicModule {
    const providers: Provider[] = [
      { provide: ACTIVITY_FEED_MODULE_OPTIONS, useValue: options },
      { provide: ACTIVITY_FEED_STORE, useValue: options.store },
      ActivityFeedService,
    ];

    return {
      module: ActivityFeedModule,
      global: options.global ?? true,
      providers,
      exports: [ActivityFeedService],
    };
  }

  /**
   * Configure the activity-feed module asynchronously.
   */
  static forRootAsync(options: ActivityFeedModuleAsyncOptions): DynamicModule {
    return {
      module: ActivityFeedModule,
      global: options.global ?? true,
      imports: options.imports ?? [],
      providers: ActivityFeedModule.createAsyncProviders(options),
      exports: [ActivityFeedService],
    };
  }

  private static createAsyncProviders(options: ActivityFeedModuleAsyncOptions): Provider[] {
    const asyncOptionsProvider: Provider = {
      provide: ACTIVITY_FEED_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };

    return [
      asyncOptionsProvider,
      {
        provide: ACTIVITY_FEED_STORE,
        useFactory: (opts: ActivityFeedModuleOptions) => {
          if (opts.store) return opts.store;
          throw new Error(
            'ActivityFeedModule requires a store. Provide one via forRoot() or forRootAsync().',
          );
        },
        inject: [ACTIVITY_FEED_MODULE_OPTIONS],
      },
      ActivityFeedService,
    ];
  }
}
