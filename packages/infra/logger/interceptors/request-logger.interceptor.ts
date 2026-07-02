import {
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Logger as PinoLoggerType } from 'pino';
import { Observable, tap } from 'rxjs';
import { PINO_LOGGER, LOGGER_MODULE_OPTIONS } from '../logger.constants';
import type { LoggerModuleOptions, LoggerRequestLoggingConfig } from '../logger.types';
import { getCorrelationId } from '../correlation-id';

/**
 * NestJS interceptor that logs HTTP request / response details.
 *
 * Records method, URL, status code, duration, and optionally headers & body.
 * Correlation IDs are automatically included when `CorrelationIdInterceptor`
 * is also registered (run this interceptor **after** the correlation-ID one).
 *
 * @example
 * ```typescript
 * // auto-registered via LoggerModule.forRoot()
 * // or manually:
 * {
 *   provide: APP_INTERCEPTOR,
 *   useClass: RequestLoggerInterceptor,
 * }
 * ```
 */
@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  constructor(
    @Inject(PINO_LOGGER)
    private readonly logger: PinoLoggerType,
    @Inject(LOGGER_MODULE_OPTIONS)
    private readonly options: LoggerModuleOptions,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const request: any = context.switchToHttp().getRequest();
    const response: any = context.switchToHttp().getResponse();
    const { method, url } = request;
    const start = Date.now();

    const config = this.options.requestLogging as LoggerRequestLoggingConfig | false;

    // Skip excluded paths
    if (config && typeof config === 'object' && config.excludePaths) {
      for (const pattern of config.excludePaths) {
        if (url === pattern) {
          return next.handle();
        }
      }
    }
    /* eslint-enable */

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          const statusCode: number = response.statusCode;

          const logData: Record<string, unknown> = {
            method,
            url,
            statusCode,
            duration,
          };

          const correlationId = getCorrelationId();
          if (correlationId) logData.correlationId = correlationId;

          if (config && typeof config === 'object') {
            /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
            if (config.includeHeaders) {
              logData.headers = this.sanitizeHeaders(request.headers, config.blacklistedHeaders);
            }
            if (config.includeBody && request.body) {
              logData.body = request.body;
            }
            /* eslint-enable */
          }

          this.logger.info(logData, 'request completed');
        },
        error: (error: Error) => {
          const duration = Date.now() - start;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          const statusCode: number = response.statusCode ?? 500;

          const logData: Record<string, unknown> = {
            method,
            url,
            statusCode,
            duration,
            err: error,
          };

          const correlationId = getCorrelationId();
          if (correlationId) logData.correlationId = correlationId;

          this.logger.error(logData, 'request failed');
        },
      }),
    );
  }

  private sanitizeHeaders(
    headers: Record<string, unknown>,
    blacklist?: string[],
  ): Record<string, unknown> {
    if (!blacklist || blacklist.length === 0) {
      return headers;
    }
    const lower = new Set(blacklist.map((h) => h.toLowerCase()));
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(headers)) {
      result[key] = lower.has(key.toLowerCase()) ? '[REDACTED]' : value;
    }
    return result;
  }
}
