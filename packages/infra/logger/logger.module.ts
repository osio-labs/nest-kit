import { type DynamicModule, type Provider, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LOGGER_MODULE_OPTIONS, PINO_LOGGER, DEFAULT_LOG_LEVEL } from './logger.constants.js';
import { loadPino } from './logger.utils.js';
import type { LoggerModuleOptions, LoggerModuleAsyncOptions } from './logger.types.js';
import { PinoLoggerService } from './logger.service.js';
import { CorrelationIdInterceptor } from './interceptors/correlation-id.interceptor.js';
import { RequestLoggerInterceptor } from './interceptors/request-logger.interceptor.js';

const DEFAULT_PRETTY_PRINT_OPTIONS: Record<string, unknown> = {
  colorize: true,
  translateTime: 'HH:MM:ss.l',
  ignore: 'pid,hostname',
};

/**
 * NestJS `DynamicModule` for structured logging with Pino.
 *
 * Registers a `PinoLoggerService` that implements NestJS's `LoggerService`
 * interface and two optional global interceptors for correlation IDs and
 * HTTP request logging.
 *
 * @example
 * ```typescript
 * import { LoggerModule } from '@os.io/nest-kit/infra/logger';
 *
 * @Module({
 *   imports: [LoggerModule.forRoot()],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class LoggerModule {
  /**
   * Configure the logger synchronously.
   *
   * @param options  Logger options (level, pretty-print, transports, …).
   *                 Defaults to `{ level: 'info' }` when omitted.
   */
  static forRoot(options?: LoggerModuleOptions): DynamicModule {
    const resolvedOptions: LoggerModuleOptions = options ?? {};
    return {
      module: LoggerModule,
      global: resolvedOptions.global ?? true,
      providers: LoggerModule.createProviders(resolvedOptions),
      exports: [PinoLoggerService],
    };
  }

  /**
   * Configure the logger asynchronously (e.g. from `ConfigService`).
   */
  static forRootAsync(options: LoggerModuleAsyncOptions): DynamicModule {
    return {
      module: LoggerModule,
      global: options.global ?? true,
      imports: options.imports ?? [],
      providers: LoggerModule.createAsyncProviders(options),
      exports: [PinoLoggerService],
    };
  }

  private static createProviders(options: LoggerModuleOptions): Provider[] {
    return [
      { provide: LOGGER_MODULE_OPTIONS, useValue: options },
      {
        provide: PINO_LOGGER,
        /* eslint-disable @typescript-eslint/no-unsafe-return */
        useFactory: async (opts: LoggerModuleOptions) => {
          const pino = await loadPino();
          const pinoOptions = LoggerModule.buildPinoOptions(opts);
          return pino.default(pinoOptions);
        },
        /* eslint-enable */
        inject: [LOGGER_MODULE_OPTIONS],
      },
      PinoLoggerService,
      ...LoggerModule.createInterceptorProviders(options),
    ];
  }

  private static createAsyncProviders(options: LoggerModuleAsyncOptions): Provider[] {
    const asyncOptionsProvider: Provider = {
      provide: LOGGER_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };

    return [
      asyncOptionsProvider,
      {
        provide: PINO_LOGGER,
        /* eslint-disable @typescript-eslint/no-unsafe-return */
        useFactory: async (opts: LoggerModuleOptions) => {
          const pino = await loadPino();
          const pinoOptions = LoggerModule.buildPinoOptions(opts);
          return pino.default(pinoOptions);
        },
        /* eslint-enable */
        inject: [LOGGER_MODULE_OPTIONS],
      },
      PinoLoggerService,
      ...LoggerModule.createInterceptorProviders(null),
    ];
  }

  private static createInterceptorProviders(options: LoggerModuleOptions | null): Provider[] {
    const providers: Provider[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const opts = options ?? ({} as LoggerModuleOptions);

    if (opts.correlationId !== false) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useClass: CorrelationIdInterceptor,
      });
    }

    if (opts.requestLogging !== false) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useClass: RequestLoggerInterceptor,
      });
    }

    return providers;
  }

  private static buildPinoOptions(options: LoggerModuleOptions): Record<string, unknown> {
    const pinoOptions: Record<string, unknown> = {
      level: options.level ?? DEFAULT_LOG_LEVEL,
    };

    if (options.pinoOptions) {
      Object.assign(pinoOptions, options.pinoOptions);
    }

    if (options.transports && options.transports.length > 0) {
      pinoOptions.transport = {
        targets: options.transports.map((t) => ({
          target: t.target,
          level: t.level ?? options.level ?? DEFAULT_LOG_LEVEL,
          options: t.options,
        })),
      };
    } else if (options.transport) {
      pinoOptions.transport = options.transport;
    } else if (options.prettyPrint) {
      pinoOptions.transport = {
        target: 'pino-pretty',
        options:
          typeof options.prettyPrint === 'object'
            ? options.prettyPrint
            : { ...DEFAULT_PRETTY_PRINT_OPTIONS },
      };
    }

    return pinoOptions;
  }
}
