# Auth Decorators — `@os.io/nest-kit/auth/decorators`

| Decorator        | Target         | What it does                                              |
| ---------------- | -------------- | --------------------------------------------------------- |
| `@CurrentUser()` | parameter      | Extracts the authenticated user from `req.user`           |
| `@Public()`      | method / class | Marks route as publicly accessible (bypasses `AuthGuard`) |

## Usage

```ts
import { CurrentUser, Public } from '@os.io/nest-kit/auth';
```

---

### `@CurrentUser(data?)`

Parameter decorator that extracts `req.user` (typed as `IAuthUser`).

```ts
@Get('me')
getProfile(@CurrentUser() user: IAuthUser) {
  return user;
}

@Get('email')
getEmail(@CurrentUser('email') email: string) {
  return email;
}
```

Returns `undefined` when no user is attached to the request.

---

### `@Public()`

Method or class decorator that sets `METADATA_PUBLIC = true` metadata, consumed by the global `AuthGuard` to skip authentication.

```ts
@Public()
@Get('login')
login() { … }

// Also works on controller level:
@Public()
@Controller('auth')
class AuthController { … }
```
