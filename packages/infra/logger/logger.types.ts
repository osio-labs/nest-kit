import type { LevelWithSilent, LoggerOptions } from 'pino';

/** Log levels supported by Pino, in order of severity. */
export type LogLevel = LevelWithSilent;

/** A single Pino transport definition (target + options + optional level). */
export interface LoggerTransport {
  target: string;
  level?: LogLevel;
  options?: Record<string, unknown>;
}

/** Configuration for correlation ID propagation. */
export interface LoggerCorrelationIdConfig {
  /** HTTP header to read/write the correlation ID (default `x-correlation-id`). */
  headerName?: string;
  /**
   * Custom ID generator function.
   * Called when no correlation ID exists in the incoming request header.
   * Defaults to `crypto.randomUUID()`.
   */
  generate?: () => string;
}

/** Configuration for HTTP request/response logging. */
export interface LoggerRequestLoggingConfig {
  /** Include request headers in the log entry. */
  includeHeaders?: boolean;
  /** Include request body in the log entry. */
  includeBody?: boolean;
  /** Headers to redact from logs (e.g. `['authorization', 'cookie']`). */
  blacklistedHeaders?: string[];
  /** URL path patterns to exclude from request logging (e.g. `['/health', '/metrics']`). */
  excludePaths?: string[];
}

/** Options accepted by `LoggerModule.forRoot()`. */
export interface LoggerModuleOptions {
  /** Minimum log level (default `info`). */
  level?: LogLevel;
  /**
   * Enable pretty-printed console output (requires `pino-pretty`).
   * Pass `true` for defaults or an options object forwarded to `pino-pretty`.
   */
  prettyPrint?: boolean | Record<string, unknown>;
  /**
   * Custom Pino transport configuration.
   * When set, overrides `prettyPrint`.
   */
  transport?: LoggerOptions['transport'];
  /**
   * Multi-transport configuration — an array of transport targets.
   * Uses `pino.transport({ targets })` under the hood.
   * When set, overrides both `prettyPrint` and `transport`.
   */
  transports?: LoggerTransport[];
  /**
   * Additional Pino options forwarded directly to the `pino()` constructor.
   * Useful for `redact`, `base`, `nestedKey`, etc.
   */
  pinoOptions?: Omit<LoggerOptions, 'level' | 'transport'>;
  /** Correlation ID configuration. Set to `false` to disable. */
  correlationId?: LoggerCorrelationIdConfig | false;
  /** Request logging configuration. Set to `false` to disable. */
  requestLogging?: LoggerRequestLoggingConfig | false;
  /** Register the module as global (default `true`). */
  global?: boolean;
}

/** Options accepted by `LoggerModule.forRootAsync()`. */
export interface LoggerModuleAsyncOptions {
  useFactory: (...args: unknown[]) => Promise<LoggerModuleOptions> | LoggerModuleOptions;
  inject?: any[];
  imports?: any[];
  global?: boolean;
}
