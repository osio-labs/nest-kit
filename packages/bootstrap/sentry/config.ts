import type { NodeOptions } from '@sentry/node';
import { ConfigService } from '@nestjs/config';
import type { ConfigReader } from '../shared';
import { fromEnv } from '../shared';

/**
 * Sentry module options — extends the official `NodeOptions` with NestJS
 * specific fields.
 *
 * All fields are optional; when omitted the bootstrapper falls back to
 * environment variables.
 */
export interface SentryConfigOptions extends Partial<NodeOptions> {
  /** Register Sentry as a global NestJS module. */
  isGlobal?: boolean;

  /**
   * Sample rate for Sentry Session Replay (browser sessions).
   * Used only when replay integration is configured.
   */
  replaysSessionSampleRate?: number;

  /**
   * Sample rate for error-only replays (browser sessions).
   *
   * Used only when replay integration is configured.
   */
  replaysOnErrorSampleRate?: number;
}

type SentryResult = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildSentryConfig(get: ConfigReader, options?: SentryConfigOptions): SentryResult {
  const dsn = options?.dsn ?? get.str('SENTRY_DSN');
  const environment =
    options?.environment ?? get.str('SENTRY_ENVIRONMENT') ?? get.str('NODE_ENV') ?? 'development';
  const release = options?.release ?? get.str('SENTRY_RELEASE');
  const tracesSampleRate = options?.tracesSampleRate ?? get.num('SENTRY_TRACES_SAMPLE_RATE') ?? 0.2;
  const profilesSampleRate =
    options?.profilesSampleRate ?? get.num('SENTRY_PROFILES_SAMPLE_RATE') ?? 0.1;
  const debug = options?.debug ?? get.bool('SENTRY_DEBUG', false);
  const spotlight = options?.spotlight ?? get.bool('SENTRY_SPOTLIGHT', false);
  const replaysSessionSampleRate =
    options?.replaysSessionSampleRate ?? get.num('SENTRY_REPLAYS_SESSION_SAMPLE_RATE') ?? 0.1;
  const replaysOnErrorSampleRate =
    options?.replaysOnErrorSampleRate ?? get.num('SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE') ?? 1.0;
  const isGlobal = options?.isGlobal ?? get.bool('SENTRY_IS_GLOBAL', false);

  const out: SentryResult = {
    dsn,
    environment,
    tracesSampleRate,
    profilesSampleRate,
    debug,
    spotlight,
    replaysSessionSampleRate,
    replaysOnErrorSampleRate,
    isGlobal,
  };

  if (release !== undefined) {
    out.release = release;
  }

  return out;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Build Sentry module options from environment variables or `ConfigService`.
 *
 * When the first argument is a `ConfigService` instance the bootstrapper
 * reads from it; otherwise it falls back to `process.env`.
 *
 * @example
 * ```ts
 * // Sync — reads process.env
 * import { init } from '@sentry/nestjs';
 *
 * init(configSentry());
 *
 * // Async — reads ConfigService
 * import { ConfigService } from '@nestjs/config';
 *
 * init(configSentry(configService));
 * ```
 *
 * Environment variables:
 * | Variable                              | Default                    | Description                              |
 * |---------------------------------------|----------------------------|------------------------------------------|
 * | `SENTRY_DSN`                          | —                          | Sentry DSN (required for data reporting) |
 * | `SENTRY_ENVIRONMENT`                  | `NODE_ENV` \|\| `development` | Environment name                       |
 * | `SENTRY_RELEASE`                      | —                          | Release version                          |
 * | `SENTRY_TRACES_SAMPLE_RATE`           | `0.2`                      | Performance tracing sample rate          |
 * | `SENTRY_PROFILES_SAMPLE_RATE`         | `0.1`                      | Profiling sample rate                    |
 * | `SENTRY_DEBUG`                        | `false`                    | Enable debug logging                     |
 * | `SENTRY_SPOTLIGHT`                    | `false`                    | Enable Spotlight for local dev           |
 * | `SENTRY_REPLAYS_SESSION_SAMPLE_RATE`  | `0.1`                      | Session replay sample rate               |
 * | `SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` | `1.0`                      | Error-only replay sample rate            |
 * | `SENTRY_IS_GLOBAL`                    | `false`                    | Register as global module                |
 */
export function configSentry(options?: SentryConfigOptions): SentryResult;
export function configSentry(
  configService: ConfigService,
  options?: SentryConfigOptions,
): SentryResult;
export function configSentry(
  configServiceOrOptions?: ConfigService | SentryConfigOptions,
  options?: SentryConfigOptions,
): SentryResult {
  if (configServiceOrOptions && 'get' in configServiceOrOptions) {
    return buildSentryConfig(fromEnv(configServiceOrOptions), options);
  }

  return buildSentryConfig(fromEnv(), configServiceOrOptions);
}
