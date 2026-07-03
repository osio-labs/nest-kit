# Auth

> Authentication & Authorization module for NestJS — stateless, horizontally scalable, strategy-based.

```
@os.io/nest-kit/auth
```

---

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '@os.io/nest-kit/auth';

@Module({
  imports: [
    AuthModule.forRoot({
      jwtSecret: process.env.JWT_SECRET,
      credentials: true,
      rbac: true,
    }),
  ],
  providers: [
    { provide: 'USER_SERVICE', useClass: YourUserService },
    { provide: 'CACHE_SERVICE', useExisting: yourCacheInstance },
  ],
})
export class AppModule {}
```

```typescript
import { Controller, Post, Get, Body } from '@nestjs/common';
import { AuthService, CurrentUser, Public, AuthMethod } from '@os.io/nest-kit/auth';
import type { IAuthUser } from '@os.io/nest-kit/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.authenticate(AuthMethod.CREDENTIALS, body);
  }

  @Get('me')
  getProfile(@CurrentUser() user: IAuthUser) {
    return user;
  }
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  AuthModule (Dynamic Module)                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  AuthGuard (global) — JWT validation                  │  │
│  │  ApiKeyGuard — API key auth on select routes          │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  AuthService (orchestrator)                           │  │
│  │  └─ authenticate() → refreshToken() → logout()       │  │
│  ├─────┬─────┬──────┬─────┬──────┬──────┬──────┬────┬───┤  │
│  │Cred │OAuth│TOTP  │Anon │Magic │ OTP  │Passk │ SSO│AK │  │
│  │     │     │      │     │ Link │      │ey    │    │   │  │
│  ├─────┴─────┴──────┴─────┴──────┴──────┴──────┴────┴───┤  │
│  │  JWT Service │ Token Blacklist │ Device Sessions      │  │
│  │  Password Srv│  Throttle Srv   │  Cache Adapter       │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  RBAC Guard │ PBAC Guard │ API Key Store              │  │
│  │  @Roles()   │ @RequirePolicy()                        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

The module follows a **strategy pattern**:

1. **AuthModule** dynamically registers strategies based on config
2. **AuthGuard** handles JWT extraction and validation globally
3. **ApiKeyGuard** handles API key authentication on select routes
4. **AuthService** delegates authentication to the correct strategy
5. **9 authentication strategies** each implement `IAuthStrategy`
6. **2 authorization systems** (RBAC + PBAC) are independent and composable
7. **Session layer** handles JWT, token blacklisting, multi-device tracking

---

## Navigation

| Page                                  | Description                                    |
| ------------------------------------- | ---------------------------------------------- |
| [Configuration](./auth-configuration) | All options: JWT, API key, strategies, session |
| [Strategies](./auth-strategies)       | 9 auth methods with code examples              |
| [Guards & Decorators](./auth-guards)  | AuthGuard, ApiKeyGuard, RbacGuard, PbacGuard   |
| [Interfaces](./auth-interfaces)       | IAuthUser, IUserService, ICacheService, …      |
| [Session Management](./auth-session)  | JWT, blacklist, device sessions, rotation      |
| [Authorization](./auth-authorization) | RBAC + PBAC detailed guide                     |
| [Services](./auth-services)           | Password, Throttle, Cache, User Service        |

---

## Exports

| Category          | Exports                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Module**        | `AuthModule`                                                                                                                                                                                                                                                                                                                                                     |
| **Services**      | `AuthService`, `JwtService`, `PasswordService`, `ThrottleService`, `TokenBlacklistService`, `DeviceSessionService`                                                                                                                                                                                                                                               |
| **Guards**        | `AuthGuard`, `ApiKeyGuard`, `RbacGuard`, `PbacGuard`                                                                                                                                                                                                                                                                                                             |
| **Decorators**    | `CurrentUser`, `Public`, `Roles`, `RequirePolicy`, `ApiKeyProtected`                                                                                                                                                                                                                                                                                             |
| **Strategies**    | `BaseStrategy`, `CredentialsStrategy`, `OAuthStrategy`, `OAuthProviderRegistry`, `TotpStrategy`, `AnonymousStrategy`, `MagicLinkStrategy`, `OtpStrategy`, `PasskeyStrategy`, `OneTapStrategy`, `SsoStrategy`                                                                                                                                                     |
| **Authorization** | `RbacService`, `PbacService`                                                                                                                                                                                                                                                                                                                                     |
| **Enum**          | `AuthMethod`                                                                                                                                                                                                                                                                                                                                                     |
| **Constants**     | `AUTH_MODULE_OPTIONS`, `CACHE_SERVICE`, `USER_SERVICE`, `AUTH_STRATEGIES`, `API_KEY_STORE`, `METADATA_PUBLIC`, `METADATA_ROLES`, `METADATA_PERMISSIONS`, `METADATA_POLICY`, `METADATA_API_KEY_PROTECTED`                                                                                                                                                         |
| **Types**         | `IAuthUser`, `IAuthRequest`, `ITokenPair`, `IAuthResult`, `IAuthStrategy`, `ICacheService`, `IUserService`, `IDeviceInfo`, `IApiKey`, `IApiKeyStore`, `PolicyDecoratorOptions`, `PolicyStatement`, `PolicyDocument`, `PolicyContext`, `PolicyEffect`                                                                                                             |
| **Options**       | `AuthModuleOptions`, `AuthModuleAsyncOptions`, `ApiKeyOptions`, `CredentialsOptions`, `OAuthOptions`, `OAuthProviderConfig`, `TOTPOptions`, `AnonymousOptions`, `MagicLinkOptions`, `OTPOptions`, `PasskeyOptions`, `OneTapOptions`, `SSOOptions`, `SamlProviderConfig`, `OidcProviderConfig`, `RBACOptions`, `PBACOptions`, `SessionOptions`, `ThrottleOptions` |
