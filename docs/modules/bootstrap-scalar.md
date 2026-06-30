# Bootstrap / Scalar

> Scalar API Reference bootstrapper.

## Install

`@scalar/nestjs-api-reference` is an optional peer dependency:

```bash
npm install @scalar/nestjs-api-reference
```

If not installed, the bootstrapper logs a warning and skips the setup gracefully.

## Usage

```ts
import { configScalarApiDoc } from '@os.io/nest-kit/bootstrap/scalar';

const app = await NestFactory.create(AppModule);

configScalarApiDoc(app, { title: 'My API', path: '/docs' });
// Browse to http://localhost:3000/docs
```

## API

### `configScalarApiDoc(app, options?)`

Mounts the Scalar API Reference UI at the given `path`.

| Option                   | Type                           | Default        | Description                                   |
| ------------------------ | ------------------------------ | -------------- | --------------------------------------------- |
| `title`                  | `string`                       | `'NestJS API'` | OpenAPI title                                 |
| `description`            | `string`                       | `''`           | OpenAPI description                           |
| `version`                | `string`                       | `'1.0'`        | OpenAPI version                               |
| `path`                   | `string`                       | `'api/docs'`   | Mount path                                    |
| `scalarOptions`          | `NestJSReferenceConfiguration` | —              | Forwarded to `apiReference()`                 |
| `swaggerDocumentOptions` | `SwaggerDocumentOptions`       | —              | Forwarded to `SwaggerModule.createDocument()` |
