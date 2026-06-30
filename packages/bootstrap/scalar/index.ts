import type { INestApplication } from '@nestjs/common';
import type { SwaggerDocumentOptions } from '@nestjs/swagger';
import type { NestJSReferenceConfiguration } from '@scalar/nestjs-api-reference';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createRequire } from 'node:module';

const _require = createRequire(__filename) as (id: string) => unknown;

interface ScalarModuleShape {
  apiReference: (
    opts: NestJSReferenceConfiguration,
  ) => (req: unknown, res: unknown, next: unknown) => void;
}

/**
 * Options for {@link configScalarApiDoc}.
 */
export interface ConfigScalarOptions {
  /** OpenAPI title (default: `'NestJS API'`). */
  title?: string;
  /** OpenAPI description (default: `''`). */
  description?: string;
  /** OpenAPI version (default: `'1.0'`). */
  version?: string;
  /** Mount path (default: `'api/docs'`). */
  path?: string;
  /** Extra options forwarded to `apiReference()` from `@scalar/nestjs-api-reference`. */
  scalarOptions?: NestJSReferenceConfiguration;
  /** Extra options forwarded to `SwaggerModule.createDocument`. */
  swaggerDocumentOptions?: SwaggerDocumentOptions;
}

/**
 * Configure Scalar API Reference on the NestJS app.
 *
 * Mounts the Scalar UI at the given `path` (default `api/docs`).
 * Requires `@scalar/nestjs-api-reference` to be installed.
 *
 * @example
 * ```ts
 * import { configScalarApiDoc } from '@os.io/nest-kit/bootstrap/scalar';
 *
 * configScalarApiDoc(app);
 * // Browse to http://localhost:3000/api/docs
 * ```
 *
 * @param app - The NestJS application instance.
 * @param options - Configuration overrides.
 */
export function configScalarApiDoc(app: INestApplication, options?: ConfigScalarOptions): void {
  const builder = new DocumentBuilder()
    .setTitle(options?.title ?? 'NestJS API')
    .setDescription(options?.description ?? '')
    .setVersion(options?.version ?? '1.0')
    .addBearerAuth();

  const config = builder.build();
  const document = SwaggerModule.createDocument(app, config, options?.swaggerDocumentOptions);

  try {
    const { apiReference } = _require('@scalar/nestjs-api-reference') as ScalarModuleShape;

    app.use(
      options?.path ?? 'api/docs',
      apiReference({
        spec: { content: document },
        ...options?.scalarOptions,
      }),
    );
  } catch {
    console.warn(
      '[@os.io/nest-kit] @scalar/nestjs-api-reference is not installed. ' +
        'Skipping Scalar API docs setup.',
    );
  }
}
