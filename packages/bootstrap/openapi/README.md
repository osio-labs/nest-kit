# @os.io/nest-kit — OpenAPI Bootstrapper

Configure OpenAPI docs with auto-detection of the UI renderer — **Scalar** (if `@scalar/nestjs-api-reference` is installed) or **Swagger** (fallback).

Lazy-loads all dependencies — nothing is imported at module scope.

---

- [Install](#install)
- [Quick Start](#quick-start)
- [Import](#import)
- [Auto-detection](#auto-detection)
- [Options](#options)
- [API](#api)

---

## Install

```bash
npm install @nestjs/swagger
```

Optional — for Scalar UI:

```bash
npm install @scalar/nestjs-api-reference
```

## Quick Start

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configOpenApi } from '@os.io/nest-kit/bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await configOpenApi(app, {
    title: 'My API',
    path: 'api/docs',
  });

  await app.listen(3000);
}
bootstrap();
```

## Import

```ts
import { configOpenApi } from '@os.io/nest-kit/bootstrap';

// Type only
import type { OpenApiOptions } from '@os.io/nest-kit/bootstrap';
```

## Auto-detection

`configOpenApi` tries to import `@scalar/nestjs-api-reference`:

| `@scalar/nestjs-api-reference` installed | Renderer                             |
| ---------------------------------------- | ------------------------------------ |
| ✅                                       | **Scalar** — modern API reference UI |
| ❌                                       | **Swagger** — classic Swagger UI     |

Both renderers share the same document (built via `@nestjs/swagger`'s `DocumentBuilder`).

## Options

| Option                   | Type                           | Default        | Description                                      |
| ------------------------ | ------------------------------ | -------------- | ------------------------------------------------ |
| `title`                  | `string`                       | `'NestJS API'` | API title                                        |
| `description`            | `string`                       | `''`           | API description                                  |
| `version`                | `string`                       | `'1.0'`        | API version                                      |
| `path`                   | `string`                       | `'api/docs'`   | Mount path for the API docs UI                   |
| `swaggerCustomOptions`   | `SwaggerCustomOptions`         | —              | Custom Swagger UI options (favicon, etc)         |
| `swaggerDocumentOptions` | `SwaggerDocumentOptions`       | —              | Options passed to `SwaggerModule#createDocument` |
| `scalarOptions`          | `NestJSReferenceConfiguration` | —              | Options passed to Scalar `apiReference`          |

## API

### `configOpenApi(app, options?)`

Configure OpenAPI documentation on a NestJS app.

- **`app`** — `INestApplication` instance
- **`options`** — optional `OpenApiOptions`

```ts
// Minimal
await configOpenApi(app);

// With options
await configOpenApi(app, { title: 'My API', path: 'docs' });
```
