import { Inject, Injectable } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import type { Logger as PinoLoggerType } from 'pino';
import { PINO_LOGGER } from './logger.constants';
import { getCorrelationId } from './correlation-id';

/**
 * NestJS `LoggerService` implementation backed by Pino.
 *
 * Bridges the NestJS logging API (`log`, `error`, `warn`, `debug`, `verbose`, `fatal`)
 * to Pino's structured JSON logger. Automatically attaches the current
 * correlation ID (if any) and context name to every log entry.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(private readonly logger: PinoLoggerService) {}
 *
 *   async run() {
 *     this.logger.log('Starting job', 'MyService');
 *     this.logger.warn({ retries: 3 }, 'Retrying request', 'MyService');
 *   }
 * }
 * ```
 */
@Injectable()
export class PinoLoggerService implements LoggerService {
  constructor(
    @Inject(PINO_LOGGER)
    private readonly logger: PinoLoggerType,
  ) {}

  log(message: any, ...optionalParams: any[]): void {
    this.call('info', message, optionalParams);
  }

  error(message: any, ...optionalParams: any[]): void {
    this.call('error', message, optionalParams);
  }

  warn(message: any, ...optionalParams: any[]): void {
    this.call('warn', message, optionalParams);
  }

  debug(message: any, ...optionalParams: any[]): void {
    this.call('debug', message, optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]): void {
    this.call('trace', message, optionalParams);
  }

  fatal(message: any, ...optionalParams: any[]): void {
    this.call('fatal', message, optionalParams);
  }

  /**
   * Create a child logger with bound context.
   * Useful for adding service-specific fields to every log entry.
   *
   * @example
   * ```typescript
   * const child = this.logger.child({ service: 'payments' });
   * child.log('Processing payment'); // includes { service: 'payments' }
   * ```
   */
  child(bindings: Record<string, unknown>): PinoLoggerService {
    return PinoLoggerService.fromPino(this.logger.child(bindings));
  }

  /**
   * Create a `PinoLoggerService` from an existing Pino logger instance.
   * Useful when working with child loggers or custom Pino instances.
   */
  static fromPino(logger: PinoLoggerType): PinoLoggerService {
    const instance = new PinoLoggerService(logger);
    return instance;
  }

  getPinoLogger(): PinoLoggerType {
    return this.logger;
  }

  private call(
    level: 'info' | 'error' | 'warn' | 'debug' | 'trace' | 'fatal',
    message: unknown,
    rawParams: unknown[],
  ): void {
    const correlationId = getCorrelationId();
    const params = rawParams.slice();

    let trace: string | undefined;
    let context: string | undefined;

    if (level === 'error' || level === 'fatal') {
      const last = params[params.length - 1];
      if (typeof last === 'string' && last !== '') {
        context = params.pop() as string | undefined;
      }
      if (params.length > 0 && typeof params[0] === 'string') {
        trace = params.shift() as string | undefined;
      }
    } else {
      const last = params[params.length - 1];
      if (typeof last === 'string' && last !== '') {
        context = params.pop() as string | undefined;
      }
    }

    const base: Record<string, unknown> = {};
    if (correlationId) base.correlationId = correlationId;
    if (context) base.context = context;
    if (trace && (level === 'error' || level === 'fatal')) base.trace = trace;

    /* eslint-disable @typescript-eslint/no-unsafe-call */
    if (typeof message === 'object' && message !== null) {
      const merged = { ...base, ...(message as Record<string, unknown>) };
      if (context) merged.context = context;
      (this.logger[level] as any)(merged);
    } else if (Object.keys(base).length > 0) {
      (this.logger[level] as any)(base, message);
    } else {
      (this.logger[level] as any)(message);
    }
    /* eslint-enable */
  }
}
