# Auth — Session Management

> JWT signing, token blacklisting, device tracking, and refresh rotation.

---

## AuthService

Central orchestrator. Use this in your controllers to authenticate, validate, refresh, and revoke tokens.

```typescript
import { AuthService, AuthMethod } from '@os.io/nest-kit/auth';

// Authenticate with any strategy
const result = await authService.authenticate(AuthMethod.CREDENTIALS, {
  email: 'user@example.com',
  password: 'secret',
});

// Validate an access token
const user = await authService.validateToken(accessToken);

// Refresh tokens (rotates the refresh token by default)
const newTokens = await authService.refreshToken(refreshToken);

// Logout a specific device
await authService.logout(accessToken, 'device-123');

// Logout all devices for a user
await authService.logoutAll('user-123');

// List active sessions for a user
const sessions = await authService.getUserSessions('user-123');
```

---

## JwtService

Low-level service for signing and verifying tokens. Uses `@nestjs/jwt` (dynamically imported).

```typescript
import { JwtService } from '@os.io/nest-kit/auth';

// Sign access + refresh token pair
const { accessToken, refreshToken } = await jwtService.signTokens(user);

// Verify an access token
const payload = await jwtService.verifyAccess(token);

// Verify a refresh token
const refreshPayload = await jwtService.verifyRefresh(token);

// Decode without verification
const decoded = jwtService.decode(token);
```

Supports HS256, RS256, and ES256 algorithms. Configure via `SessionOptions.algorithm`.

---

## Token Blacklist

Redis-backed token blacklist for immediate revocation. Tokens are stored with TTL matching their remaining lifespan.

```typescript
import { TokenBlacklistService } from '@os.io/nest-kit/auth';

// Blacklist a specific token
await blacklistService.blacklistAccess(jti, ttl);

// Check if a token is blacklisted
const revoked = await blacklistService.isBlacklisted(jti);

// Revoke an entire token family
await blacklistService.revokeFamily(familyId, ttl);

// Check if a family is revoked
const isRevoked = await blacklistService.isFamilyRevoked(familyId);

// Remove a specific entry
await blacklistService.remove(jti);
```

---

## Device Sessions

Track active devices/sessions per user for multi-device support (Telegram-style). Enable via `SessionOptions.multiDevice`.

```typescript
import { DeviceSessionService } from '@os.io/nest-kit/auth';

// Register a device session
await deviceSessionService.register(
  {
    deviceId: 'device-xyz',
    userId: 'user-123',
    userAgent: 'Mozilla/5.0 ...',
    ip: '203.0.113.1',
    lastActivity: new Date(),
    createdAt: new Date(),
  },
  604800, // TTL in seconds
);

// Get a specific session
const session = await deviceSessionService.getSession('user-123', 'device-xyz');

// Get all sessions for a user
const sessions = await deviceSessionService.getUserSessions('user-123');

// Remove a specific device session (per-device logout)
await deviceSessionService.removeSession('user-123', 'device-xyz');

// Remove all sessions for a user
await deviceSessionService.removeAllUserSessions('user-123');
```

---

## Refresh Token Rotation

Enabled by default (`SessionOptions.rotation: true`). Each refresh request invalidates the old refresh token and issues a new pair:

1. Client sends refresh token
2. Server validates and revokes the old token
3. Server issues new access + refresh tokens
4. If a stolen refresh token is used after rotation, the entire token family is revoked (automatic security)
