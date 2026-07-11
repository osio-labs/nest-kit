import type { INestApplication } from '@nestjs/common';
import type { OpenApiOptions } from './options';

export type { OpenApiOptions, SecurityMethod, SecuritySchemePreset } from './options';

/**
 * Configure OpenAPI documentation with auto-detection of the UI renderer.
 * Lazy-loads all dependencies.
 */
export async function configOpenApi(app: INestApplication, config?: OpenApiOptions): Promise<void> {
  try {
    await import('@nestjs/swagger');
  } catch {
    throw new Error(
      '[@os.io/nest-kit] @nestjs/swagger is required when using configOpenApi. Install: npm install @nestjs/swagger',
    );
  }

  try {
    await import('@scalar/nestjs-api-reference');
    const { configScalarApiDoc } = await import('./scalar/config');
    configScalarApiDoc(app, config);
  } catch {
    const { configSwagger } = await import('./swagger/config');
    configSwagger(app, config);
  }
}
