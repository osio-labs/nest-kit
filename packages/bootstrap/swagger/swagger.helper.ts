import type { Type } from '@nestjs/common';

/**
 * Minimal type definition for `@nestjs/swagger` module.
 *
 * Only the decorators and utilities used by this package are declared.
 */
export type SwaggerModule = {
  getSchemaPath: (model: Type<unknown>) => string;
  ApiExtraModels: (...models: Type<unknown>[]) => MethodDecorator;
  ApiOkResponse: (opts: Record<string, unknown>) => MethodDecorator;
  ApiCreatedResponse: (opts: Record<string, unknown>) => MethodDecorator;
  ApiNoContentResponse: (opts: Record<string, unknown>) => MethodDecorator;
  ApiBadRequestResponse: (opts: Record<string, unknown>) => MethodDecorator;
  ApiUnauthorizedResponse: (opts: Record<string, unknown>) => MethodDecorator;
  ApiForbiddenResponse: (opts: Record<string, unknown>) => MethodDecorator;
  ApiNotFoundResponse: (opts: Record<string, unknown>) => MethodDecorator;
  ApiConflictResponse: (opts: Record<string, unknown>) => MethodDecorator;
  ApiUnprocessableEntityResponse: (opts: Record<string, unknown>) => MethodDecorator;
  ApiTooManyRequestsResponse: (opts: Record<string, unknown>) => MethodDecorator;
  ApiParam: (opts: Record<string, unknown>) => MethodDecorator & ClassDecorator;
  ApiQuery: (opts: Record<string, unknown>) => MethodDecorator & ClassDecorator;
  ApiBody: (opts: Record<string, unknown>) => MethodDecorator;
  ApiProperty: (opts?: Record<string, unknown>) => PropertyDecorator;
};

// ── Lazy-loaded singleton ────────────────────────────────────────

let cached: SwaggerModule | null | undefined;

/**
 * Lazily load `@nestjs/swagger` and cache the result.
 *
 * Returns `null` when the package is not installed, allowing all
 * decorators to gracefully no-op.
 */
export function getSwagger(): SwaggerModule | null {
  if (cached === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cached = require('@nestjs/swagger') as SwaggerModule;
    } catch {
      cached = null;
    }
  }
  return cached;
}

/**
 * Reset the cached swagger module reference.
 *
 * Used in tests to re-evaluate availability.
 */
export function resetSwaggerCache(): void {
  cached = undefined;
}
