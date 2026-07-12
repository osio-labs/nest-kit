# @os.io/nest-kit — OpenAPI

Simplify OpenAPI documentation in NestJS — one function to bootstrap, smart decorators to document.

---

- [Install](#install)
- [Quick Start](#quick-start)
- [1. Bootstrap — `configOpenApi`](#1-bootstrap---configopenapi)
- [2. Decorators](#2-decorators)

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
import { configOpenApi } from '@os.io/nest-kit/bootstrap/openapi';

const app = await NestFactory.create(AppModule);
await configOpenApi(app, { title: 'My API' });
await app.listen(3000);
```

---

## 1. Bootstrap — `configOpenApi`

One function to set up Swagger or Scalar. Auto-detects which UI renderer is installed.

| `@scalar/nestjs-api-reference` installed | Renderer                             |
| ---------------------------------------- | ------------------------------------ |
| yes                                      | **Scalar** — modern API reference UI |
| no                                       | **Swagger** — classic Swagger UI     |

### Options

| Option                   | Type                           | Default        | Description                                    |
| ------------------------ | ------------------------------ | -------------- | ---------------------------------------------- |
| `title`                  | `string`                       | `'NestJS API'` | API title                                      |
| `description`            | `string`                       | `''`           | API description                                |
| `version`                | `string`                       | `'1.0'`        | API version                                    |
| `path`                   | `string`                       | `'api/docs'`   | Mount path                                     |
| `securityMethods`        | `SecurityMethod[]`             | bearer only    | Security schemes registered on the OpenAPI doc |
| `swaggerCustomOptions`   | `SwaggerCustomOptions`         | —              | Forwarded to `SwaggerModule.setup()`           |
| `swaggerDocumentOptions` | `SwaggerDocumentOptions`       | —              | Forwarded to `SwaggerModule.createDocument()`  |
| `scalarOptions`          | `NestJSReferenceConfiguration` | —              | Forwarded to `apiReference()` (Scalar only)    |

### Examples

```ts
// Minimal — defaults work out of the box
await configOpenApi(app);

// Custom title, description, version
await configOpenApi(app, {
  title: 'Payment Service',
  description: 'Internal payment processing API',
  version: '2.1.0',
});

// Custom mount path
await configOpenApi(app, { path: 'docs' });

// Bearer + API key security
await configOpenApi(app, {
  securityMethods: [
    { name: 'bearer', preset: 'bearer' },
    { name: 'X-API-KEY', preset: 'apikey' },
  ],
});

// Disable all security schemes
await configOpenApi(app, { securityMethods: [] });

// Swagger UI customisations
await configOpenApi(app, {
  swaggerCustomOptions: {
    customfavIcon: 'https://example.com/favicon.ico',
    customSiteTitle: 'My API Docs',
    swaggerOptions: { docExpansion: 'none', filter: true },
  },
});

// Limit routes in the document
await configOpenApi(app, {
  swaggerDocumentOptions: {
    include: [UsersController, OrdersController],
    deepScanRoutes: true,
  },
});

// Scalar-specific options
await configOpenApi(app, {
  scalarOptions: { theme: 'purple', layout: 'modern' },
});
```

### Security presets

| Preset     | Default `SecuritySchemeObject`                            |
| ---------- | --------------------------------------------------------- |
| `'bearer'` | `{ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }` |
| `'basic'`  | `{ type: 'http', scheme: 'basic' }`                       |
| `'oauth2'` | `{ type: 'oauth2', flows: {} }`                           |
| `'apikey'` | `{ type: 'apiKey', in: 'header' }`                        |
| `'cookie'` | `{ type: 'apiKey', in: 'cookie' }`                        |

---

## 2. Decorators

Enhanced wrappers around `@nestjs/swagger` that reduce boilerplate and auto-generate examples.

**What they do differently:**

| Decorator               | Simplifies                                                |
| ----------------------- | --------------------------------------------------------- |
| `ApiProperty`           | Auto-example from `type` + `format` (no manual `example`) |
| `ApiParam` / `ApiQuery` | Same auto-example for parameters                          |
| `ApiResponse`           | Auto-detects HTTP method, wraps in `{ data: T }`          |
| `CrudApi`               | One decorator for all CRUD methods on a controller        |
| `ApiEndpoint`           | Combines summary, tags, auth, and responses in one call   |
| `ApiPaginatedResponse`  | Paginated response schema in one line                     |

### Before vs After

**Before** — raw `@nestjs/swagger`:

```ts
import { ApiProperty, ApiOkResponse, ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 75.5 })
  score: number;
}

@Get(':id')
@ApiOperation({ summary: 'Get user by ID' })
@ApiTags('Users')
@ApiBearerAuth()
@ApiOkResponse({ type: User })
@ApiNotFoundResponse({ description: 'User not found' })
@ApiBadRequestResponse({ description: 'Invalid ID' })
findOne(@Param('id') id: string) {}
```

**After** — `@os.io/nest-kit`:

```ts
import { ApiProperty, ApiParam, ApiEndpoint, ApiResponse } from '@os.io/nest-kit/bootstrap/openapi';

class CreateUserDto {
  @ApiProperty({ type: String, format: 'email' })  // auto-example: 'user@example.com'
  email: string;

  @ApiProperty({ type: Number, format: 'percentage' })  // auto-example: 75.5
  score: number;
}

@Get(':id')
@ApiParam({ name: 'id', type: String, format: 'uuid' })  // auto-example: '550e8400-...'
@ApiEndpoint({
  summary: 'Get user by ID',
  tags: ['Users'],
  bearer: true,
  ok: User,
  notFound: 'User not found',
  badRequest: 'Invalid ID',
})
findOne(@Param('id') id: string) {}
```

### Decorator reference

#### `ApiProperty` / `ApiParam` / `ApiQuery`

Auto-generates examples based on `type` + `format`:

```ts
@ApiProperty({ type: String, format: 'email' })     // → 'user@example.com'
@ApiProperty({ type: String, format: 'uuid' })       // → '550e8400-e29b-41d4-a716-446655440000'
@ApiProperty({ type: Number, format: 'percentage' }) // → 75.5
@ApiProperty({ type: String, format: 'money' })      // → '1,234.56'
```

Supported formats: `uuid`, `email`, `date`, `date-time`, `uri`, `ipv4`, `ipv6`, `money`, `decimal`, `currency`, `percentage`, `phone`, `credit-card`, and more.

#### `ApiResponse`

Auto-detects HTTP method and wraps in standard response schema:

```ts
// GET → 200, POST → 201, DELETE → 204
@Get(':id')
@ApiResponse(User, { errors: { notFound: 'User not found' } })
findOne(@Param('id') id: string) {}

// Mode: 'single' (default), 'list', 'paged', 'offset', 'cursor'
@Get()
@ ApiResponse(User, { mode: 'paged' })
findAll() {}
```

#### `CrudApi`

One decorator for all CRUD operations:

```ts
@CrudApi(User, {
  create: { errors: { conflict: 'Email already exists' } },
  findOne: { errors: { notFound: 'User not found' } },
  delete: { errors: { notFound: 'User not found' } },
})
@Controller('users')
export class UsersController {}
```

#### `ApiEndpoint`

Combines everything in one call:

```ts
@ApiEndpoint({
  summary: 'Create a new user',
  tags: ['Users'],
  bearer: true,
  created: User,
  badRequest: 'Validation failed',
  conflict: 'Email already exists',
})
@Post()
create(@Body() dto: CreateUserDto) {}
```

#### `ApiPaginatedResponse`

One line for paginated response:

```ts
@Get()
@ApiPaginatedResponse(User)
findAll() {}
// → { data: User[], total: number, page: number, limit: number }
```
