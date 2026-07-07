/**
 * @os.io/nest-kit/bootstrap/validation
 *
 * Standard NestJS `ValidationPipe` integration.
 *
 * @module
 * @packageDocumentation
 */

import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import type { ValidationConfigOptions } from './types';
import { buildPipeOptions } from './types';

/**
 * Configure the standard NestJS `ValidationPipe` as a global pipe.
 *
 * @param app - NestJS application instance.
 * @param opts - Normalised validation options.
 */
export function configNormalValidation(app: INestApplication, opts: ValidationConfigOptions): void {
  app.useGlobalPipes(
    new ValidationPipe({
      ...buildPipeOptions(opts),
      disableErrorMessages: !(opts.detailedErrors ?? true),
    }),
  );
}
