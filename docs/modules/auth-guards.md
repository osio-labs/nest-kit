# Auth — Guards & Decorators

> Route protection and parameter injection utilities.

---

## Guards

### AuthGuard (global)

Registered automatically by `AuthModule`. Validates JWT from:

- `Authorization: Bearer <token>` header
- `x-access-token` cookie
- `token` query parameter

Skips routes marked with `@Public()`. Attaches decoded `IAuthUser` to `request.user`.

### ApiKeyGuard

Authenticates requests using an API key from the `X-API-Key` header (configurable).

```typescript
import { ApiKeyGuard, ApiKeyProtected } from '@os.io/nest-kit/auth';

@Controller('/api/v3')
@UseGuards(ApiKeyGuard)
export class ThirdPartyController {
  @Get('orders')
  list() {}

  @ApiKeyProtected({ headerName: 'X-Custom-Key' })
  @Get('special')
  special() {}
}
```

Requires a provider under the `'API_KEY_STORE'` injection token implementing `IApiKeyStore`:

```typescript
import { API_KEY_STORE } from '@os.io/nest-kit/auth';
import type { IApiKeyStore, IApiKey } from '@os.io/nest-kit/auth';

class MyStore implements IApiKeyStore {
  async validate(key: string): Promise<IApiKey | null> {
    // look up and return key metadata, or null if invalid
  }
}

// Register in your module:
{ provide: API_KEY_STORE, useClass: MyStore }
```

The guard validates the key, checks activity and expiry, then attaches `IAuthUser` to `request.user` — making it fully compatible with `@CurrentUser()`, `@Roles()`, and `@RequirePolicy()` decorators.

### RbacGuard

```typescript
import { Roles, RbacGuard } from '@os.io/nest-kit/auth';

@Controller('admin')
@UseGuards(RbacGuard)
export class AdminController {
  @Get()
  @Roles('admin')
  list() {}

  @Delete(':id')
  @Roles('admin', 'super-admin', { requireAll: false })
  delete() {}
}
```

Enforces role checks. By default, a user needs at least one of the listed roles. Pass `{ requireAll: true }` to require all.

### PbacGuard

```typescript
import { RequirePolicy, PbacGuard } from '@os.io/nest-kit/auth';

@Controller('documents')
@UseGuards(PbacGuard)
export class DocumentController {
  @Get(':id')
  @RequirePolicy({ action: 'document:read', resource: 'doc:*' })
  read() {}

  @Delete(':id')
  @RequirePolicy({ action: 'document:delete', resource: (req) => `doc:${req.params.id}` })
  delete() {}
}
```

Enforces policy-based access control. The `resource` can be a static string or a function receiving the request.

---

## Decorators

### @Public()

Marks a route handler or controller as publicly accessible, bypassing the global `AuthGuard`.

```typescript
import { Public } from '@os.io/nest-kit/auth';

@Public()
@Post('register')
register() {}
```

Can be applied at class level to make all routes in a controller public.

### @CurrentUser()

Parameter decorator that extracts the authenticated user from `request.user`.

```typescript
import { CurrentUser } from '@os.io/nest-kit/auth';
import type { IAuthUser } from '@os.io/nest-kit/auth';

// Returns the full IAuthUser object
@Get('me')
getProfile(@CurrentUser() user: IAuthUser) { … }

// Returns only the email
@Get('email')
getEmail(@CurrentUser('email') email: string) { … }
```

### @Roles()

Requires specific roles to access a route. Works with `RbacGuard`.

```typescript
import { Roles } from '@os.io/nest-kit/auth';

@Roles('admin')
@Roles('admin', 'moderator')
@Roles('admin', 'super-admin', { requireAll: true })
```

### @RequirePolicy()

Requires a policy check on a route handler. Works with `PbacGuard`.

```typescript
import { RequirePolicy } from '@os.io/nest-kit/auth';

@RequirePolicy({ action: 'document:delete', resource: 'org:*' })
@RequirePolicy({ action: 'document:read', resource: (req) => req.params.docId })
```

### @ApiKeyProtected()

Sets per-route API key options. Works with `ApiKeyGuard`.

```typescript
import { ApiKeyProtected } from '@os.io/nest-kit/auth';

@ApiKeyProtected({ headerName: 'X-Custom-Key' })
@ApiKeyProtected({ queryParam: 'api_key' })
```

---

## Quick reference

| Decorator               | Target         | Purpose                                      |
| ----------------------- | -------------- | -------------------------------------------- |
| `@Public()`             | Class / method | Bypass global AuthGuard                      |
| `@CurrentUser()`        | Parameter      | Extract authenticated user from request      |
| `@CurrentUser('email')` | Parameter      | Extract a single user property               |
| `@Roles('admin')`       | Method         | Require specific roles (with RbacGuard)      |
| `@RequirePolicy({...})` | Method         | Require policy check (with PbacGuard)        |
| `@ApiKeyProtected()`    | Class / method | Configure API key options (with ApiKeyGuard) |
