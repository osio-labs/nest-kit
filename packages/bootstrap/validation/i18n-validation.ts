/**
 * @os.io/nest-kit/bootstrap/validation
 *
 * `nestjs-i18n` validation pipe and exception filter integration.
 *
 * @module
 * @packageDocumentation
 */

import type { INestApplication, ValidationPipeOptions } from '@nestjs/common';
import { I18nValidationPipe, I18nValidationExceptionFilter } from 'nestjs-i18n';
import type { ValidationConfigOptions } from './types';
import { defaultOptions } from './types';

/**
 * Configure `I18nValidationPipe` and `I18nValidationExceptionFilter`
 * from `nestjs-i18n` as global pipe and filter.
 *
 * @param app - NestJS application instance.
 * @param opts - Normalised validation options.
 */
export function configI18nValidation(app: INestApplication, opts: ValidationConfigOptions): void {
  const pipeOptions: ValidationPipeOptions = {
    transform: opts.transform ?? defaultOptions.transform,
    transformOptions: {
      enableImplicitConversion:
        opts.enableImplicitConversion ?? defaultOptions.enableImplicitConversion,
    },
    whitelist: opts.whitelist ?? defaultOptions.whitelist,
    forbidNonWhitelisted: opts.forbidNonWhitelisted ?? defaultOptions.forbidNonWhitelisted,
  };

  app.useGlobalPipes(new I18nValidationPipe(pipeOptions));
  app.useGlobalFilters(
    new I18nValidationExceptionFilter({
      detailedErrors: opts.detailedErrors ?? false,
    }),
  );
}
