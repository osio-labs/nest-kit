# Bootstrap / Swagger

> Swagger / OpenAPI documentation bootstrapper.

## Install

`@nestjs/swagger` is an optional peer dependency:

```bash
npm install @nestjs/swagger
```

If not installed, the bootstrapper logs a warning and skips the setup gracefully.

## Usage

```ts
import { configSwagger } from '@os.io/nest-kit/bootstrap/swagger';

const app = await NestFactory.create(AppModule);

configSwagger(app, { title: 'My API', version: '1.0.0' });
// Browse to http://localhost:3000/api/docs
```

## API

### `configSwagger(app, options?)`

Mounts the Swagger UI at the given `path` (default `api/docs`).

| Option                   | Type                     | Default        | Description                                   |
| ------------------------ | ------------------------ | -------------- | --------------------------------------------- |
| `title`                  | `string`                 | `'NestJS API'` | OpenAPI title                                 |
| `description`            | `string`                 | `''`           | OpenAPI description                           |
| `version`                | `string`                 | `'1.0'`        | OpenAPI version                               |
| `path`                   | `string`                 | `'api/docs'`   | Mount path                                    |
| `swaggerCustomOptions`   | `SwaggerCustomOptions`   | —              | Forwarded to `SwaggerModule.setup()`          |
| `swaggerDocumentOptions` | `SwaggerDocumentOptions` | —              | Forwarded to `SwaggerModule.createDocument()` |

Defaults include `persistAuthorization: true` and a custom favicon from Scalar.
