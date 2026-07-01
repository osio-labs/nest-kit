# @os.io/nest-kit/auth

Authentication & Authorization module for NestJS — stateless, horizontally scalable.

## Installation

```bash
npm install @os.io/nest-kit
```

### Optional peer dependencies

Install only the strategies you need:

```bash
# Required for JWT signing
npm install @nestjs/jwt

# Password hashing
npm install bcrypt

# TOTP / 2FA
npm install otpauth

# Passkey / WebAuthn
npm install @simplewebauthn/server
```

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
    // You must provide these two services:
    { provide: 'USER_SERVICE', useClass: YourUserService },
    { provide: 'CACHE_SERVICE', useExisting: yourCacheInstance },
  ],
})
export class AppModule {}
```

Then protect your routes:

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { AuthService, CurrentUser, Public, Roles, AuthMethod } from '@os.io/nest-kit/auth';
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

## Configuration

### AuthModuleOptions

| Option              | Type                            | Default           | Description                      |
| ------------------- | ------------------------------- | ----------------- | -------------------------------- |
| `jwtSecret`         | `string`                        | —                 | JWT secret (HS256)               |
| `jwtPrivateKey`     | `string`                        | —                 | Private key PEM (RS256/ES256)    |
| `jwtPublicKey`      | `string`                        | —                 | Public key PEM (RS256/ES256)     |
| `passwordRounds`    | `number`                        | `12`              | Bcrypt cost factor               |
| `cacheServiceToken` | `string`                        | `'CACHE_SERVICE'` | Injection token for cache        |
| `userServiceToken`  | `string`                        | `'USER_SERVICE'`  | Injection token for user service |
| `global`            | `boolean`                       | `true`            | Register module as global        |
| `credentials`       | `boolean \| CredentialsOptions` | `false`           | Enable email/password auth       |
| `oauth`             | `boolean \| OAuthOptions`       | `false`           | Enable OAuth providers           |
| `totp`              | `boolean \| TOTPOptions`        | `false`           | Enable TOTP 2FA                  |
| `anonymous`         | `boolean \| AnonymousOptions`   | `false`           | Enable anonymous sessions        |
| `magicLink`         | `boolean \| MagicLinkOptions`   | `false`           | Enable magic link login          |
| `otp`               | `boolean \| OTPOptions`         | `false`           | Enable OTP via email/phone       |
| `passkey`           | `boolean \| PasskeyOptions`     | `false`           | Enable WebAuthn passkeys         |
| `onetap`            | `boolean \| OneTapOptions`      | `false`           | Enable Google/Apple OneTap       |
| `sso`               | `boolean \| SSOOptions`         | `false`           | Enable SAML/OIDC SSO             |
| `rbac`              | `boolean \| RBACOptions`        | `false`           | Enable RBAC authorization        |
| `pbac`              | `boolean \| PBACOptions`        | `false`           | Enable PBAC authorization        |
| `session`           | `SessionOptions`                | —                 | Session/JWT configuration        |
| `throttle`          | `ThrottleOptions`               | —                 | Rate limiting config             |

### Authentication Methods

Each method can be toggled independently:

```typescript
AuthModule.forRoot({
  jwtSecret: 'secret',
  credentials: true,
  oauth: {
    google: { clientId: '...', clientSecret: '...', callbackUrl: '...' },
    github: { clientId: '...', clientSecret: '...', callbackUrl: '...' },
  },
  totp: { issuer: 'MyApp' },
  magicLink: { tokenExpiresIn: 1800 },
});
```

## Authorization

### RBAC (Role-Based Access Control)

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

### PBAC (Policy-Based Access Control)

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

Policies are evaluated using a simple engine that supports wildcard matching and conditions:

```typescript
// Policy document example
{
  statements: [
    { effect: 'allow', actions: ['document:*'], resources: ['doc:*'] },
    { effect: 'deny', actions: ['document:delete'], resources: ['doc:secret-*'] },
  ],
}
```

You can use both guards independently on different routes in the same application.

## Session Management

### Multi-Device Tracking

```typescript
AuthModule.forRoot({
  session: { multiDevice: true },
});
```

### Per-Device Logout (Telegram-style)

```typescript
// Logout a specific device
await authService.logout(accessToken, 'device-123');

// List active sessions
const sessions = await authService.getUserSessions('user-1');

// Logout all devices
await authService.logoutAll('user-1');
```

### Refresh Token Rotation

Enabled by default. Each refresh invalidates the old token and issues a new pair. If a stolen token is used after rotation, the entire token family is revoked.

## Cache Service

You **must** register a provider under the `'CACHE_SERVICE'` injection token:

```typescript
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({ ... }),
  ],
  providers: [
    {
      provide: 'CACHE_SERVICE',
      useExisting: 'CACHE_MANAGER', // alias for cache-manager
    },
  ],
})
export class AppModule {}
```

The cache is used for:

- **Token validation**: Validated JWT payloads are cached for 30s
- **Token blacklist**: Revoked tokens stored until their natural expiry
- **Device sessions**: Active session tracking
- **OTP / Magic Link**: Temporary token storage
- **Login throttling**: Attempt counters
- **RBAC/ PBAC**: Role-permission and policy caches

## User Service

You **must** register a provider under the `'USER_SERVICE'` injection token implementing `IUserService`:

```typescript
import type { IUserService, IAuthUser } from '@os.io/nest-kit/auth';

class YourUserService implements IUserService {
  async findByEmail(email: string): Promise<IAuthUser | null> { ... }
  async findById(id: string): Promise<IAuthUser | null> { ... }
  async create(data: any): Promise<IAuthUser> { ... }
  async validatePassword(user: IAuthUser, password: string): Promise<boolean> { ... }
  // ... implement all required methods
}
```

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

## Horizontal Scaling

For horizontal scaling:

1. Use a shared Redis/Valkey as the cache backend
2. Use asymmetric JWT (RS256/ES256) so any service can verify tokens without calling the auth service
3. Publish your public key via `/.well-known/jwks.json`

## TODO / Roadmap

- [ ] OTP/SMS provider integration (Twilio, etc.)
- [ ] WebAuthn credential storage interface
- [ ] Google OneTap ID token verification
- [ ] SAML assertion parser
- [ ] OIDC discovery + JWKS verification
- [ ] Backup code generation and verification for 2FA
- [ ] API key authentication strategy
