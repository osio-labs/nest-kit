import {
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
  Inject,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { LOGGER_MODULE_OPTIONS, DEFAULT_CORRELATION_ID_HEADER } from '../logger.constants';
import type { LoggerModuleOptions } from '../logger.types';
import { correlationIdStorage } from '../correlation-id';

/**
 * NestJS interceptor that extracts or generates a correlation ID for every
 * incoming HTTP request and makes it available via `getCorrelationId()`.
 *
 * The correlation ID is:
 * - either read from the request header (`x-correlation-id` by default)
 * - or auto-generated as a v4 UUID
 * - propagated downstream via `AsyncLocalStorage`
 * - set on the response header for client tracing
 *
 * @example
 * ```typescript
 * // auto-registered via LoggerModule.forRoot()
 * // or manually:
 * {
 *   provide: APP_INTERCEPTOR,
 *   useClass: CorrelationIdInterceptor,
 * }
 * ```
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  constructor(
    @Inject(LOGGER_MODULE_OPTIONS)
    private readonly options: LoggerModuleOptions,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    const request: any = context.switchToHttp().getRequest();
    const response: any = context.switchToHttp().getResponse();

    const headerName =
      (this.options.correlationId as any)?.headerName?.toLowerCase() ??
      DEFAULT_CORRELATION_ID_HEADER;

    const generateId = (this.options.correlationId as any)?.generate ?? randomUUID;

    const existing = request.headers[headerName];
    const correlationId: string =
      typeof existing === 'string' && existing.length > 0 ? existing : generateId();

    request.correlationId = correlationId;
    response.setHeader(headerName, correlationId);
    /* eslint-enable */

    return new Observable((subscriber) => {
      correlationIdStorage.run(correlationId, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
