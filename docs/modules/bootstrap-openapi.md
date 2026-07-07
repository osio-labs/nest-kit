# Bootstrap / OpenAPI

> OpenAPI documentation bootstrapper with auto-detection of the UI renderer.

Auto-detects Scalar UI (if `@scalar/nestjs-api-reference` is installed) or falls back to Swagger UI.

## Install

Both libraries are optional peer dependencies:

```bash
npm install @nestjs/swagger
```

For Scalar UI (optional — falls back to Swagger UI if not installed):

```bash
npm install @scalar/nestjs-api-reference
```

## Usage

```ts
import { configOpenApi } from '@os.io/nest-kit/bootstrap';

const app = await NestFactory.create(AppModule);

await configOpenApi(app, { title: 'My API', version: '1.0.0' });
// Browse to http://localhost:3000/api/docs
```

## API

### `configOpenApi(app, options?)`

Mounts the Swagger UI or Scalar API Reference UI at the given `path` (default `api/docs`).

| Option                   | Type                           | Default                             | Description                                   |
| ------------------------ | ------------------------------ | ----------------------------------- | --------------------------------------------- |
| `title`                  | `string`                       | `'NestJS API'`                      | OpenAPI title                                 |
| `description`            | `string`                       | `''`                                | OpenAPI description                           |
| `version`                | `string`                       | `'1.0'`                             | OpenAPI version                               |
| `path`                   | `string`                       | `'api/docs'`                        | Mount path                                    |
| `swaggerCustomOptions`   | `object`                       | `{ customfavIcon, swaggerOptions }` | Forwarded to `SwaggerModule.setup()`          |
| `swaggerDocumentOptions` | `SwaggerDocumentOptions`       | —                                   | Forwarded to `SwaggerModule.createDocument()` |
| `scalarOptions`          | `NestJSReferenceConfiguration` | —                                   | Forwarded to `apiReference()` (Scalar only)   |

Default `swaggerCustomOptions` include `persistAuthorization: true` and a Scalar-branded favicon.
