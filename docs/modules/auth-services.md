# Auth — Services

> Password hashing, rate limiting, cache service, user service, and horizontal scaling.

---

## PasswordService

Hashes and verifies passwords using bcrypt (dynamically imported).

```typescript
import { PasswordService } from '@os.io/nest-kit/auth';

const hash = await passwordService.hash('plaintextPassword');
const match = await passwordService.verify('plaintextPassword', hash);
```

Configure cost rounds via `AuthModuleOptions.passwordRounds` (default `12`).

**Peer dependency:** `npm install bcrypt`

---

## ThrottleService

Rate-limits login attempts per identifier (email, IP, etc.) using the shared cache.

```typescript
import { ThrottleService } from '@os.io/nest-kit/auth';

// Check if an identifier is throttled (throws ThrottleException if over limit)
await throttleService.check('user@example.com');

// Record a failed attempt
await throttleService.recordFailure('user@example.com');

// Clear attempt counter (e.g. after successful login)
await throttleService.clear('user@example.com');
```

Configure via `AuthModuleOptions.throttle`:

```typescript
{
  throttle: {
    maxAttempts: 5,     // max attempts per window
    windowSeconds: 900, // 15 minute window
  },
}
```

---

## Cache Service

You **must** register a provider under the `'CACHE_SERVICE'` injection token (or a custom token via `cacheServiceToken`).

```typescript
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [CacheModule.register({/* Redis, memory, etc. */})],
  providers: [
    {
      provide: 'CACHE_SERVICE',
      useExisting: 'CACHE_MANAGER', // alias for cache-manager
    },
  ],
})
export class AppModule {}
```

### What the cache is used for

| Feature          | Description                         | TTL          |
| ---------------- | ----------------------------------- | ------------ |
| Token validation | Validated JWT payloads              | 30s          |
| Token blacklist  | Revoked tokens until natural expiry | token TTL    |
| Device sessions  | Active session tracking             | session TTL  |
| OTP / Magic Link | Temporary token storage             | 5-15 min     |
| Login throttling | Attempt counters                    | 15 min       |
| RBAC             | Role-permission mappings            | configurable |
| PBAC             | Policy documents                    | configurable |

---

## User Service

You **must** register a provider under the `'USER_SERVICE'` injection token implementing `IUserService`.

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '@os.io/nest-kit/auth';

@Module({
  imports: [AuthModule.forRoot({ ... })],
  providers: [
    {
      provide: 'USER_SERVICE',
      useClass: YourUserService,
    },
  ],
})
export class AppModule {}
```

### Example implementation

```typescript
import type { IUserService, IAuthUser } from '@os.io/nest-kit/auth';

class YourUserService implements IUserService {
  async findByEmail(email: string): Promise<IAuthUser | null> {
    const user = await this.userRepo.findOneBy({ email });
    return user ? this.toAuthUser(user) : null;
  }

  async findById(id: string): Promise<IAuthUser | null> {
    const user = await this.userRepo.findOneBy({ id });
    return user ? this.toAuthUser(user) : null;
  }

  async findByUsername(username: string): Promise<IAuthUser | null> { ... }
  async findBySocialId(provider: string, socialId: string): Promise<IAuthUser | null> { ... }
  async create(data: any): Promise<IAuthUser> { ... }
  async update(id: string, data: any): Promise<IAuthUser> { ... }
  async validatePassword(user: IAuthUser, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }
  async setPassword(id: string, passwordHash: string): Promise<void> { ... }
  async getTotpSecret(id: string): Promise<string | null> { ... }
  async setTotpSecret(id: string, secret: string): Promise<void> { ... }
  async getRoles(id: string): Promise<string[]> { ... }
  async getPermissions(id: string): Promise<string[]> { ... }

  private toAuthUser(user: UserEntity): IAuthUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles.map(r => r.name),
    };
  }
}
```

---

## Horizontal Scaling

For horizontal scaling:

1. **Shared cache**: Use a shared Redis/Valkey as the cache backend (for token blacklist, device sessions, rate limiting, etc.)
2. **Asymmetric JWT**: Use RS256 or ES256 so any service can verify tokens without calling the auth service
3. **Public key distribution**: Publish your public key via `/.well-known/jwks.json`

```typescript
AuthModule.forRoot({
  jwtPrivateKey: process.env.JWT_PRIVATE_KEY, // keep private
  jwtPublicKey: process.env.JWT_PUBLIC_KEY, // publish via JWKS
  session: { algorithm: 'RS256' },
  cacheServiceToken: 'CACHE_SERVICE',
  // Use shared Redis backend
});
```
