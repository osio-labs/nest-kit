import type { INestApplication } from '@nestjs/common';
import type { SwaggerCustomOptions, SwaggerDocumentOptions } from '@nestjs/swagger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const DEFAULT_FAVICON_URL = 'https://scalar.com/favicon.svg';

interface Options {
  title?: string;
  description?: string;
  version?: string;
  path?: string;
  swaggerCustomOptions?: SwaggerCustomOptions;
  swaggerDocumentOptions?: SwaggerDocumentOptions;
}

/**
 * Configure Swagger UI on the NestJS app.
 *
 * Mounts the Swagger UI at the given `path` (default `api/docs`).
 *
 * @param app - The NestJS application instance.
 * @param options - Configuration overrides.
 */
export function configSwagger(app: INestApplication, options?: Options): void {
  const builder = new DocumentBuilder()
    .setTitle(options?.title ?? 'NestJS API')
    .setDescription(options?.description ?? '')
    .setVersion(options?.version ?? '1.0')
    .addBearerAuth();

  const config = builder.build();
  const document = SwaggerModule.createDocument(app, config, options?.swaggerDocumentOptions);

  SwaggerModule.setup(options?.path ?? 'api/docs', app, document, {
    customfavIcon: options?.swaggerCustomOptions?.customfavIcon ?? DEFAULT_FAVICON_URL,
    ...options?.swaggerCustomOptions,
    swaggerOptions: {
      persistAuthorization: true,
      ...options?.swaggerCustomOptions?.swaggerOptions,
    },
  });
}
