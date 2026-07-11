# @os.io/nest-kit — Swagger Response Decorators

Simplify OpenAPI documentation for CRUD controllers. One import, one decorator per endpoint.

---

- [Install](#install)
- [Quick Start](#quick-start)
- [Import](#import)
- [ApiResponse](#apiresponse)
- [CrudApi](#crudapi)
- [Response Modes](#response-modes)
- [Error Responses](#error-responses)
- [Comparison](#comparison)
- [API](#api)

---

## Install

```bash
npm install @nestjs/swagger
```

## Quick Start

```ts
import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiResponse, CrudApi } from '@os.io/nest-kit/bootstrap';

class User {
  id!: string;
  name!: string;
  email!: string;
}

// Option 1: Per-endpoint decorator
@Controller('users')
export class UsersController {
  @Get(':id')
  @ApiResponse(User, { errors: { notFound: 'User not found' } })
  findOne(@Param('id') id: string) {}

  @Post()
  @ApiResponse(User, { errors: { conflict: 'Email already exists' } })
  create(@Body() dto: any) {}
}

// Option 2: Class-level CrudApi (auto-detects HTTP methods)
@CrudApi(User, {
  create: { errors: { conflict: 'Email already exists' } },
  findOne: { errors: { notFound: 'User not found' } },
  update: { errors: { notFound: 'User not found', conflict: 'Duplicate email' } },
  delete: { errors: { notFound: 'User not found' } },
})
@Controller('users')
export class UsersController {
  @Get()
  findAll() {}

  @Get(':id')
  findOne(@Param('id') id: string) {}

  @Post()
  create(@Body() dto: any) {}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {}

  @Delete(':id')
  remove(@Param('id') id: string) {}
}
```

## Import

```ts
import { ApiResponse, CrudApi } from '@os.io/nest-kit/bootstrap';

// Types only
import type { ApiResponseOptions, CrudApiOptions } from '@os.io/nest-kit/bootstrap';
```

## ApiResponse

Decorator for individual controller methods. Automatically detects the HTTP method (`@Get`, `@Post`, `@Patch`, `@Delete`) and applies the appropriate response schema.

### GET single (200)

```ts
@Get(':id')
@ApiResponse(User, { errors: { notFound: 'User not found' } })
findOne(@Param('id') id: string) {}
```

Generates:

```json
{
  "200": {
    "description": "",
    "schema": {
      "type": "object",
      "properties": {
        "data": { "$ref": "#/components/schemas/User" }
      },
      "required": ["data"]
    }
  },
  "404": { "description": "User not found" }
}
```

### GET list — paged (200)

```ts
@Get()
@ApiResponse(User, { mode: 'paged' })
findAll(@Query() q: FindDto) {}
```

Generates:

```json
{
  "200": {
    "schema": {
      "type": "object",
      "properties": {
        "data": { "type": "array", "items": { "$ref": "#/components/schemas/User" } },
        "total": { "type": "number" },
        "page": { "type": "number" },
        "limit": { "type": "number" }
      },
      "required": ["data", "total", "page", "limit"]
    }
  }
}
```

### POST (201)

```ts
@Post()
@ApiResponse(User, {
  errors: {
    conflict: ['Email already exists', 'Username taken'],
    badRequest: 'Validation failed',
  },
})
create(@Body() dto: CreateUserDto) {}
```

Generates:

```json
{
  "201": {
    "schema": {
      "type": "object",
      "properties": {
        "data": { "$ref": "#/components/schemas/User" }
      },
      "required": ["data"]
    }
  },
  "400": { "description": "Validation failed" },
  "409": [{ "description": "Email already exists" }, { "description": "Username taken" }]
}
```

### PATCH (200)

```ts
@Patch(':id')
@ApiResponse(User, {
  errors: { notFound: 'User not found', conflict: 'Duplicate email' },
})
update(@Param('id') id: string, @Body() dto: UpdateUserDto) {}
```

### DELETE (204)

```ts
@Delete(':id')
@ApiResponse(User, { errors: { notFound: 'User not found' } })
remove(@Param('id') id: string) {}
```

Generates:

```json
{
  "204": { "description": "" },
  "404": { "description": "User not found" }
}
```

## CrudApi

Class-level decorator that auto-applies response metadata to CRUD methods.

Scans the controller prototype for methods matching CRUD operation names (`create`, `findOne`, `update`, `delete`), checks if they have the expected HTTP method decorator, and applies the appropriate response.

```ts
@CrudApi(User, {
  create: { errors: { conflict: 'Email already exists' } },
  findOne: { errors: { notFound: 'User not found' } },
  update: { errors: { notFound: 'User not found', conflict: 'Duplicate email' } },
  delete: { errors: { notFound: 'User not found' } },
})
@Controller('users')
export class UsersController {
  @Get()
  findAll(@Query() q: FindDto) {} // auto: 200 { data: User[] }

  @Get(':id')
  findOne(@Param('id') id: string) {} // auto: 200 { data: User }, 404

  @Post()
  create(@Body() dto: CreateUserDto) {} // auto: 201 { data: User }, 409

  @Patch(':id')
  update(@Param('id') id: string) {} // auto: 200 { data: User }, 404, 409

  @Delete(':id')
  remove(@Param('id') id: string) {} // auto: 204, 404
}
```

### Method detection

`@CrudApi` only applies responses to methods that match both the **operation name** and the **expected HTTP method**:

| Operation  | Expected HTTP method | Applied? |
| ---------- | -------------------- | -------- |
| `create`   | `@Post()`            | Yes      |
| `findOne`  | `@Get()`             | Yes      |
| `update`   | `@Patch()`           | Yes      |
| `delete`   | `@Delete()`          | Yes      |
| `findAll`  | any                  | No       |
| `validate` | none                 | No       |

### Overriding per endpoint

Individual `@ApiResponse` decorators on methods take precedence over `@CrudApi`:

```ts
@CrudApi(User, {
  findOne: { errors: { notFound: 'User not found' } },
})
@Controller('users')
export class UsersController {
  @Get(':id')
  @ApiResponse(InternalUserDto, { errors: { notFound: 'Custom message' } }) // overrides
  findOne(@Param('id') id: string) {}
}
```

## Response Modes

The `mode` option controls the response schema shape:

| Mode     | Schema                                | Use case                 |
| -------- | ------------------------------------- | ------------------------ |
| `single` | `{ data: T }`                         | GET /:id, POST (default) |
| `paged`  | `{ data: T[], total, page, limit }`   | GET /?page=1&limit=10    |
| `offset` | `{ data: T[], total, skip, limit }`   | GET /?skip=0&limit=10    |
| `cursor` | `{ data: T[], nextCursor?, hasMore }` | GET /?cursor=xxx         |

Default modes by HTTP method:

| HTTP method | Default mode |
| ----------- | ------------ |
| GET         | `single`     |
| POST        | `single`     |
| PATCH       | `single`     |
| DELETE      | N/A (204)    |

## Error Responses

Error responses accept a string, an array of strings, or `true` (for a default message):

```ts
@ApiResponse(User, {
  errors: {
    // Single message
    notFound: 'User not found',

    // Multiple messages for same status
    conflict: ['Email already exists', 'Username taken'],

    // Default message
    badRequest: true,
  },
})
```

Supported error types:

| Key               | HTTP status | Default message      |
| ----------------- | ----------- | -------------------- |
| `badRequest`      | 400         | Bad request          |
| `unauthorized`    | 401         | Unauthorized         |
| `forbidden`       | 403         | Forbidden            |
| `notFound`        | 404         | Not found            |
| `conflict`        | 409         | Conflict             |
| `unprocessable`   | 422         | Unprocessable entity |
| `tooManyRequests` | 429         | Too many requests    |

## Comparison

### GET single

**Before (`@nestjs/swagger`):**

```ts
import { ApiOkResponse, ApiExtraModels, ApiNotFoundResponse } from '@nestjs/swagger';

@Get(':id')
@ApiOkResponse({
  schema: {
    type: 'object',
    properties: { data: { $ref: getSchemaPath(User) } },
    required: ['data'],
  },
})
@ApiExtraModels(User)
@ApiNotFoundResponse({ description: 'User not found' })
findOne(@Param('id') id: string) {}
```

**After (`@ApiResponse`):**

```ts
import { ApiResponse } from '@os.io/nest-kit/bootstrap';

@Get(':id')
@ApiResponse(User, { errors: { notFound: 'User not found' } })
findOne(@Param('id') id: string) {}
```

### GET paged

**Before:**

```ts
import { ApiOkResponse, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';

@Get()
@ApiExtraModels(User)
@ApiOkResponse({
  schema: {
    type: 'object',
    properties: {
      data: { type: 'array', items: { $ref: getSchemaPath(User) } },
      total: { type: 'number' },
      page: { type: 'number' },
      limit: { type: 'number' },
    },
    required: ['data', 'total', 'page', 'limit'],
  },
})
findAll(@Query() q: FindDto) {}
```

**After:**

```ts
import { ApiResponse } from '@os.io/nest-kit/bootstrap';

@Get()
@ApiResponse(User, { mode: 'paged' })
findAll(@Query() q: FindDto) {}
```

### Full CRUD controller

**Before:** 5–7 imports, ~70 lines of decorator code.

**After:** 1 import, ~15 lines:

```ts
import { CrudApi } from '@os.io/nest-kit/bootstrap';

@CrudApi(User, {
  create: { errors: { conflict: 'Email already exists' } },
  findOne: { errors: { notFound: 'User not found' } },
  update: { errors: { notFound: 'User not found', conflict: 'Duplicate email' } },
  delete: { errors: { notFound: 'User not found' } },
})
@Controller('users')
export class UsersController {
  @Get()
  findAll(@Query() q: FindDto) {}

  @Get(':id')
  findOne(@Param('id') id: string) {}

  @Post()
  create(@Body() dto: CreateUserDto) {}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {}

  @Delete(':id')
  remove(@Param('id') id: string) {}
}
```

## API

### `@ApiResponse(options)`

| Parameter             | Type                                          | Required | Description                                       |
| --------------------- | --------------------------------------------- | -------- | ------------------------------------------------- |
| `options.type`        | `Type<T>`                                     | Yes      | Entity class for the response schema              |
| `options.mode`        | `'single' \| 'paged' \| 'offset' \| 'cursor'` | No       | Response shape (default: `'single'`)              |
| `options.status`      | `number`                                      | No       | HTTP status code (auto-detected from HTTP method) |
| `options.description` | `string`                                      | No       | Description shown in Swagger UI                   |
| `options.errors`      | `CrudErrors`                                  | No       | Error responses keyed by status name              |

### `@CrudApi(entity, options?)`

| Parameter         | Type                      | Required | Description                           |
| ----------------- | ------------------------- | -------- | ------------------------------------- |
| `entity`          | `Type<T>`                 | Yes      | Entity class for all response schemas |
| `options.create`  | `{ errors?: CrudErrors }` | No       | Config for `@Post()` methods          |
| `options.findOne` | `{ errors?: CrudErrors }` | No       | Config for `@Get(':id')` methods      |
| `options.update`  | `{ errors?: CrudErrors }` | No       | Config for `@Patch(':id')` methods    |
| `options.delete`  | `{ errors?: CrudErrors }` | No       | Config for `@Delete(':id')` methods   |

### Graceful degradation

Both decorators gracefully no-op when `@nestjs/swagger` is not installed. No crashes, no errors.
