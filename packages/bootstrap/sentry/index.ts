/**
 * @os.io/nest-kit/bootstrap/sentry
 *
 * Sentry module configuration bootstrapper for NestJS applications.
 * Provides a `configSentry` helper that reads from environment variables
 * or ConfigService and returns options consumable by `@sentry/nestjs`'s
 * `SentryModule.forRoot()`.
 *
 * @module
 * @packageDocumentation
 */

import type { Getter } from '../with-config';
import { withConfig } from '../with-config';

/** Environment variable keys used by the Sentry bootstrapper. */
export interface SentryConfigOptions {
  /** Sentry DSN. Also read from `SENTRY_DSN`. Required. */
  dsn?: string;

  /** Environment name (e.g. `production`, `staging`). Defaults to `"production"`. */
  environment?: string;

  /** Release version (e.g. git commit SHA). */
  release?: string;

  /** Enable debug mode. Defaults to `false`. */
  debug?: boolean;

  /** Traces sample rate (0–1). Defaults to `1.0`. */
  tracesSampleRate?: number;

  /** Profiles sample rate (0–1). */
  profilesSampleRate?: number;

  /** Attach stack traces to events. Defaults to `true`. */
  attachStacktrace?: boolean;

  /** Register the module as `@Global()`. Defaults to `true`. */
  isGlobal?: boolean;
}

/* ------------------------------------------------------------------ */
/*  configSentry                                                       */
/* ------------------------------------------------------------------ */

function buildSentryConfig(get: Getter, options?: SentryConfigOptions): Record<string, unknown> {
  return {
    dsn: options?.dsn ?? get.str('SENTRY_DSN'),
    environment: options?.environment ?? get.str('SENTRY_ENVIRONMENT') ?? 'production',
    release: options?.release ?? get.str('SENTRY_RELEASE'),
    debug: options?.debug ?? get.bool('SENTRY_DEBUG', false),
    tracesSampleRate: options?.tracesSampleRate ?? get.num('SENTRY_TRACES_SAMPLE_RATE') ?? 1.0,
    profilesSampleRate: options?.profilesSampleRate ?? get.num('SENTRY_PROFILES_SAMPLE_RATE'),
    attachStacktrace: options?.attachStacktrace ?? get.bool('SENTRY_ATTACH_STACKTRACE', true),
    isGlobal: options?.isGlobal ?? get.bool('SENTRY_IS_GLOBAL', true),
  };
}

/**
 * Build Sentry module options from environment variables or ConfigService.
 *
 * The returned object can be passed directly to `SentryModule.forRoot()` from
 * `@sentry/nestjs`.
 *
 * When `configService` is provided, reads from it (which internally may read
 * `process.env` by default). Otherwise reads directly from `process.env`.
 *
 * @param options - Optional overrides (dsn, environment, release, etc.).
 * @param configService - Optional ConfigService (for `registerAsync` pattern).
 *
 * @example
 * ```ts
 * // Sync — reads process.env
 * SentryModule.forRoot(configSentry())
 *
 * // Async — uses ConfigService
 * SentryModule.forRootAsync({
 *   imports: [ConfigModule],
 *   inject: [ConfigService],
 *   useFactory: (cs) => configSentry(undefined, cs),
 * })
 * ```
 *
 * Environment variables:
 * | Variable                      | Default        | Description                 |
 * |-------------------------------|----------------|-----------------------------|
 * | `SENTRY_DSN`                  | —              | Sentry DSN (required)       |
 * | `SENTRY_ENVIRONMENT`          | `production`   | Environment name            |
 * | `SENTRY_RELEASE`              | —              | Release version             |
 * | `SENTRY_DEBUG`                | `false`        | Enable debug mode           |
 * | `SENTRY_TRACES_SAMPLE_RATE`   | `1.0`          | Traces sample rate (0–1)    |
 * | `SENTRY_PROFILES_SAMPLE_RATE` | —              | Profiles sample rate (0–1)  |
 * | `SENTRY_ATTACH_STACKTRACE`    | `true`         | Attach stack traces         |
 * | `SENTRY_IS_GLOBAL`            | `true`         | Register as global module   |
 */
export const configSentry = withConfig<SentryConfigOptions, Record<string, unknown>>(
  buildSentryConfig,
);

export { initSentry } from './instrument';
