/**
 * @os.io/nest-kit/bootstrap/validation
 *
 * Global validation configuration for NestJS applications.
 * Auto-detects `nestjs-i18n` and applies the appropriate
 * validation pipe and exception filter.
 *
 * @module
 * @packageDocumentation
 */

import type { INestApplication } from '@nestjs/common';
import type { ValidationConfigOptions } from './types.js';
import { defaultOptions } from './types.js';
import { configNormalValidation } from './normal-validation.js';

export type { ValidationConfigOptions };

/**
 * Configure global validation pipe and exception filter.
 *
 * When `nestjs-i18n` is installed, uses `I18nValidationPipe` and
 * `I18nValidationExceptionFilter` for i18n-aware error messages.
 * Otherwise falls back to the standard NestJS `ValidationPipe`.
 *
 * @param app - NestJS application instance.
 * @param options - Optional overrides.
 *
 * @example
 * ```ts
 * // main.ts
 * import { configValidation } from '@os.io/nest-kit/bootstrap';
 *
 * async function bootstrap() {
 *   const app = await NestFactory.create(AppModule);
 *   configValidation(app);
 *   await app.listen(3000);
 * }
 * ```
 *
 * @example
 * ```ts
 * // With custom options
 * configValidation(app, { whitelist: false });
 * ```
 */
export async function configValidation(
  app: INestApplication,
  options?: ValidationConfigOptions,
): Promise<void> {
  const opts = { ...defaultOptions, ...options };

  try {
    await import('nestjs-i18n');
    const { configI18nValidation } = await import('./i18n-validation.js');
    configI18nValidation(app, opts);
  } catch {
    configNormalValidation(app, opts);
  }
}
