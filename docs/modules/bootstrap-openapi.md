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

| Option                   | Type                           | Default                             | Description                                    |
| ------------------------ | ------------------------------ | ----------------------------------- | ---------------------------------------------- |
| `title`                  | `string`                       | `'NestJS API'`                      | OpenAPI title                                  |
| `description`            | `string`                       | `''`                                | OpenAPI description                            |
| `version`                | `string`                       | `'1.0'`                             | OpenAPI version                                |
| `path`                   | `string`                       | `'api/docs'`                        | Mount path                                     |
| `securityMethods`        | `SecurityMethod[]`             | bearer only                         | Security schemes registered on the OpenAPI doc |
| `swaggerCustomOptions`   | `object`                       | `{ customfavIcon, swaggerOptions }` | Forwarded to `SwaggerModule.setup()`           |
| `swaggerDocumentOptions` | `SwaggerDocumentOptions`       | —                                   | Forwarded to `SwaggerModule.createDocument()`  |
| `scalarOptions`          | `NestJSReferenceConfiguration` | —                                   | Forwarded to `apiReference()` (Scalar only)    |

Default `swaggerCustomOptions` include `persistAuthorization: true` and a Scalar-branded favicon.

### `securityMethods`

Controls which security schemes are registered in the OpenAPI document.
Defaults to bearer auth when omitted; pass an empty array to disable.

Each entry maps to `DocumentBuilder.addSecurity(name, options)` with an optional
`preset` that fills in sensible defaults.

**Presets:**

| Preset     | Default `SecuritySchemeObject`                            |
| ---------- | --------------------------------------------------------- |
| `'bearer'` | `{ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }` |
| `'basic'`  | `{ type: 'http', scheme: 'basic' }`                       |
| `'oauth2'` | `{ type: 'oauth2', flows: {} }`                           |
| `'apikey'` | `{ type: 'apiKey', in: 'header' }`                        |
| `'cookie'` | `{ type: 'apiKey', in: 'cookie' }`                        |

**Examples:**

```ts
// Default — single bearer auth
await configOpenApi(app);

// Bearer + API key
await configOpenApi(app, {
  securityMethods: [
    { name: 'bearer', preset: 'bearer' },
    { name: 'X-API-KEY', preset: 'apikey' },
  ],
});

// Preset with overridden fields
await configOpenApi(app, {
  securityMethods: [{ name: 'jwt', preset: 'bearer', options: { bearerFormat: 'Token' } }],
});

// Fully custom (no preset)
await configOpenApi(app, {
  securityMethods: [{ name: 'digest', options: { type: 'http', scheme: 'digest' } }],
});

// Disable all security schemes
await configOpenApi(app, { securityMethods: [] });
```
