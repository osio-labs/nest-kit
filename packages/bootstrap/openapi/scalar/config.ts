import type { INestApplication } from '@nestjs/common';
import type { SwaggerDocumentOptions } from '@nestjs/swagger';
import type { NestJSReferenceConfiguration } from '@scalar/nestjs-api-reference';
import type { SecurityMethod } from '../options';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { applySecurityMethods } from '../security';

interface Options {
  title?: string;
  description?: string;
  version?: string;
  path?: string;
  securityMethods?: SecurityMethod[];
  scalarOptions?: NestJSReferenceConfiguration;
  swaggerDocumentOptions?: SwaggerDocumentOptions;
}

/**
 * Configure Scalar API Reference on the NestJS app.
 *
 * Mounts the Scalar UI at the given `path` (default `api/docs`).
 * Requires `@scalar/nestjs-api-reference` to be installed.
 *
 * @param app - The NestJS application instance.
 * @param options - Configuration overrides.
 */
export function configScalarApiDoc(app: INestApplication, options?: Options): void {
  const builder = new DocumentBuilder()
    .setTitle(options?.title ?? 'NestJS API')
    .setDescription(options?.description ?? '')
    .setVersion(options?.version ?? '1.0');

  applySecurityMethods(builder, options?.securityMethods);

  const config = builder.build();
  const document = SwaggerModule.createDocument(app, config, options?.swaggerDocumentOptions);

  app.use(
    options?.path ?? 'api/docs',
    apiReference({
      spec: { content: document },
      ...options?.scalarOptions,
    }),
  );
}
