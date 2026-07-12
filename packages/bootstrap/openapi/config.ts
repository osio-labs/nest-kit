import type { INestApplication } from '@nestjs/common';
import type { OpenApiOptions } from './security.js';

/**
 * Configure OpenAPI documentation with auto-detection of the UI renderer.
 *
 * Requires `@nestjs/swagger` to be installed.
 *
 * @param app   - The NestJS application instance.
 * @param config - Optional OpenAPI configuration overrides.
 */
export async function configOpenApi(app: INestApplication, config?: OpenApiOptions): Promise<void> {
  try {
    await import('@scalar/nestjs-api-reference');
    const { configScalarApiDoc } = await import('./scalar.config.js');
    configScalarApiDoc(app, config);
  } catch {
    const { configSwagger } = await import('./swagger.config.js');
    configSwagger(app, config);
  }
}
