/**
 * @os.io/nest-kit/infra/logger
 *
 * Structured logging for NestJS with Pino — fast, low-overhead,
 * JSON-based logging with correlation IDs and HTTP request logging.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { LoggerModule } from '@os.io/nest-kit/infra/logger';
 *
 * @Module({
 *   imports: [LoggerModule.forRoot()],
 * })
 * export class AppModule {}
 * ```
 *
 * Then inject `PinoLoggerService` anywhere:
 *
 * ```typescript
 * import { PinoLoggerService } from '@os.io/nest-kit/infra/logger';
 *
 * @Injectable()
 * export class MyService {
 *   constructor(private readonly logger: PinoLoggerService) {}
 *
 *   run() {
 *     this.logger.log('Hello from Pino!', 'MyService');
 *     this.logger.warn({ retries: 3 }, 'Retrying', 'MyService');
 *   }
 * }
 * ```
 *
 * @module
 * @packageDocumentation
 */

// ──────── Types ────────
export type {
  LogLevel,
  LoggerTransport,
  LoggerCorrelationIdConfig,
  LoggerRequestLoggingConfig,
  LoggerModuleOptions,
  LoggerModuleAsyncOptions,
} from './logger.types.js';

// ──────── Constants ────────
export {
  LOGGER_MODULE_OPTIONS,
  PINO_LOGGER,
  DEFAULT_LOG_LEVEL,
  DEFAULT_CORRELATION_ID_HEADER,
} from './logger.constants.js';

// ──────── Service ────────
export { PinoLoggerService } from './logger.service.js';

// ──────── Correlation ID ────────
export { getCorrelationId, runWithCorrelationId } from './correlation-id.js';

// ──────── Interceptors ────────
export { CorrelationIdInterceptor } from './interceptors/correlation-id.interceptor.js';
export { RequestLoggerInterceptor } from './interceptors/request-logger.interceptor.js';

// ──────── NestJS Module ────────
export { LoggerModule } from './logger.module.js';
