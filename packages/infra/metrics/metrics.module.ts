import { type DynamicModule, type Provider, Module, Global } from '@nestjs/common';
import { METRICS_ADAPTER, METRICS_MODULE_OPTIONS } from './metrics.constants.js';
import { MetricsService } from './metrics.service.js';
import type { MetricsModuleOptions, MetricsModuleAsyncOptions } from './metrics.types.js';

/**
 * NestJS `DynamicModule` for application metrics.
 *
 * Wraps any {@link MetricsAdapter} and exposes a convenient
 * {@link MetricsService} for recording counters, gauges, histograms,
 * and timings.
 *
 * ## Synchronous setup
 *
 * ```typescript
 * import { MetricsModule } from '@os.io/nest-kit/infra/metrics';
 * import { PrometheusAdapter } from '@os.io/nest-kit/infra/metrics/adapters';
 *
 * @Module({
 *   imports: [
 *     MetricsModule.forRoot({
 *       adapter: new PrometheusAdapter(),
 *       defaultTags: { app: 'my-api', env: 'production' },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * ## Async setup
 *
 * ```typescript
 * MetricsModule.forRootAsync({
 *   useFactory: (config: ConfigService) => ({
 *     adapter: new PrometheusAdapter({ pushGatewayUrl: config.get('PUSH_GATEWAY') }),
 *     defaultTags: { app: config.get('APP_NAME') },
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Global()
@Module({})
export class MetricsModule {
  /**
   * Configure the metrics module synchronously.
   *
   * @param options  Adapter instance and optional configuration.
   */
  static forRoot(options: MetricsModuleOptions): DynamicModule {
    const providers: Provider[] = [
      { provide: METRICS_MODULE_OPTIONS, useValue: options },
      { provide: METRICS_ADAPTER, useValue: options.adapter },
      MetricsService,
    ];

    return {
      module: MetricsModule,
      global: options.global ?? true,
      providers,
      exports: [MetricsService],
    };
  }

  /**
   * Configure the metrics module asynchronously.
   */
  static forRootAsync(options: MetricsModuleAsyncOptions): DynamicModule {
    return {
      module: MetricsModule,
      global: options.global ?? true,
      imports: options.imports ?? [],
      providers: MetricsModule.createAsyncProviders(options),
      exports: [MetricsService],
    };
  }

  private static createAsyncProviders(options: MetricsModuleAsyncOptions): Provider[] {
    const asyncOptionsProvider: Provider = {
      provide: METRICS_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };

    return [
      asyncOptionsProvider,
      {
        provide: METRICS_ADAPTER,
        useFactory: (opts: MetricsModuleOptions) => {
          if (opts.adapter) return opts.adapter;
          throw new Error(
            'MetricsModule requires an adapter. Provide one via forRoot() or forRootAsync().',
          );
        },
        inject: [METRICS_MODULE_OPTIONS],
      },
      MetricsService,
    ];
  }
}
