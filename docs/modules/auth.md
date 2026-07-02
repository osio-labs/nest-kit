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
┌─────────────────────────────────────────────────────────┐
│  AuthModule (Dynamic Module)                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │  AuthGuard (global)                               │  │
│  │  └─ validates JWT → attaches user to request      │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  AuthService (orchestrator)                       │  │
│  │  └─ authenticate() → refreshToken() → logout()   │  │
│  ├─────┬─────┬──────┬─────┬──────┬──────┬──────┬────┤  │
│  │Cred │OAuth│TOTP  │Anon │Magic │ OTP  │Passk │ SSO│  │
│  │     │     │      │     │ Link │      │ey    │    │  │
│  ├─────┴─────┴──────┴─────┴──────┴──────┴──────┴────┤  │
│  │  JWT Service │ Token Blacklist │ Device Sessions  │  │
│  │  Password Srv│  Throttle Srv   │  Cache Adapter   │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  RBAC Guard │ PBAC Guard                          │  │
│  │  @Roles()   │ @RequirePolicy()                    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

The module follows a **strategy pattern**:

1. **AuthModule** dynamically registers strategies based on config
2. **AuthGuard** handles JWT extraction and validation globally
3. **AuthService** delegates authentication to the correct strategy
4. **9 authentication strategies** each implement `IAuthStrategy`
5. **2 authorization systems** (RBAC + PBAC) are independent and composable
6. **Session layer** handles JWT, token blacklisting, multi-device tracking

---

## Navigation

| Page                                  | Description                                 |
| ------------------------------------- | ------------------------------------------- |
| [Configuration](./auth-configuration) | All options: JWT, strategies, session, etc. |
| [Strategies](./auth-strategies)       | 9 auth methods with code examples           |
| [Guards & Decorators](./auth-guards)  | AuthGuard, RbacGuard, PbacGuard, decorators |
| [Interfaces](./auth-interfaces)       | IAuthUser, IUserService, ICacheService, …   |
| [Session Management](./auth-session)  | JWT, blacklist, device sessions, rotation   |
| [Authorization](./auth-authorization) | RBAC + PBAC detailed guide                  |
| [Services](./auth-services)           | Password, Throttle, Cache, User Service     |

---

## Exports

| Category          | Exports                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Module**        | `AuthModule`                                                                                                                                                                                                                                                                                                                                    |
| **Services**      | `AuthService`, `JwtService`, `PasswordService`, `ThrottleService`, `TokenBlacklistService`, `DeviceSessionService`                                                                                                                                                                                                                              |
| **Guards**        | `AuthGuard`, `RbacGuard`, `PbacGuard`                                                                                                                                                                                                                                                                                                           |
| **Decorators**    | `CurrentUser`, `Public`, `Roles`, `RequirePolicy`                                                                                                                                                                                                                                                                                               |
| **Strategies**    | `BaseStrategy`, `CredentialsStrategy`, `OAuthStrategy`, `OAuthProviderRegistry`, `TotpStrategy`, `AnonymousStrategy`, `MagicLinkStrategy`, `OtpStrategy`, `PasskeyStrategy`, `OneTapStrategy`, `SsoStrategy`                                                                                                                                    |
| **Authorization** | `RbacService`, `PbacService`                                                                                                                                                                                                                                                                                                                    |
| **Enum**          | `AuthMethod`                                                                                                                                                                                                                                                                                                                                    |
| **Constants**     | `AUTH_MODULE_OPTIONS`, `CACHE_SERVICE`, `USER_SERVICE`, `AUTH_STRATEGIES`, `METADATA_PUBLIC`, `METADATA_ROLES`, `METADATA_PERMISSIONS`, `METADATA_POLICY`                                                                                                                                                                                       |
| **Types**         | `IAuthUser`, `IAuthRequest`, `ITokenPair`, `IAuthResult`, `IAuthStrategy`, `ICacheService`, `IUserService`, `IDeviceInfo`, `PolicyDecoratorOptions`, `PolicyStatement`, `PolicyDocument`, `PolicyContext`, `PolicyEffect`                                                                                                                       |
| **Options**       | `AuthModuleOptions`, `AuthModuleAsyncOptions`, `CredentialsOptions`, `OAuthOptions`, `OAuthProviderConfig`, `TOTPOptions`, `AnonymousOptions`, `MagicLinkOptions`, `OTPOptions`, `PasskeyOptions`, `OneTapOptions`, `SSOOptions`, `SamlProviderConfig`, `OidcProviderConfig`, `RBACOptions`, `PBACOptions`, `SessionOptions`, `ThrottleOptions` |
