/**
 * @os.io/nest-kit/bootstrap/sentry/instrument
 *
 * Sentry instrumentation helper for NestJS applications.
 *
 * Follows the official NestJS Sentry recipe:
 * https://docs.nestjs.com/recipes/sentry
 *
 * Create an `instrument.ts` in your project root and call `initSentry()`
 * **before** importing any other modules in `main.ts`.
 *
 * @example
 * ```ts
 * // instrument.ts
 * import { initSentry } from '@os.io/nest-kit/bootstrap/sentry/instrument';
 * import { nodeProfilingIntegration } from '@sentry/profiling-node';
 *
 * initSentry({
 *   tracesSampleRate: 1.0,
 *   profilesSampleRate: 1.0,
 *   integrations: [nodeProfilingIntegration()],
 * });
 * ```
 *
 * @module
 * @packageDocumentation
 */

import { configSentry, type SentryConfigOptions } from './index';

/**
 * Initialize Sentry SDK with configuration from environment variables.
 *
 * Must be called **before** any other imports in your application entry point.
 *
 * @param options - Optional overrides for Sentry configuration.
 */
export async function initSentry(options?: SentryConfigOptions): Promise<void> {
  const cfg = configSentry(options);

  try {
    const Sentry = await import('@sentry/nestjs');
    Sentry.init(cfg);
  } catch {
    throw new Error(
      '[@os.io/nest-kit] @sentry/nestjs is required. ' + 'Install: npm install @sentry/nestjs',
    );
  }
}
