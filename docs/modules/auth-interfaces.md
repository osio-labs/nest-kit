# Auth — Interfaces

> All type definitions and consumer contracts.

---

## IAuthUser

Represents an authenticated user. Used in JWT payloads, request objects, and guards.

```typescript
interface IAuthUser {
  /** Unique user identifier (UUID or numeric ID as string) */
  id: string;

  /** Email address (may be absent for anonymous users) */
  email?: string;

  /** Phone number */
  phone?: string;

  /** Username or display name */
  username?: string;

  /** Assigned roles for RBAC */
  roles?: string[];

  /** Direct permissions */
  permissions?: string[];

  /** Whether this is an anonymous session */
  isAnonymous?: boolean;

  /** Whether the user has passed 2FA in this session */
  isMfaVerified?: boolean;

  /** Custom claims bag for extensibility */
  [key: string]: unknown;
}
```

---

## IAuthRequest

Extended NestJS request with authenticated user info. Attached by `AuthGuard` after successful token validation.

```typescript
interface IAuthRequest {
  user?: IAuthUser;
  accessToken?: string;
  refreshToken?: string;
  deviceId?: string;
  sessionId?: string;
}
```

---

## IAuthResult

Returned by every authentication strategy on success.

```typescript
interface IAuthResult {
  user: IAuthUser;
  tokens: ITokenPair;
  isNewUser?: boolean;
  isMfaRequired?: boolean;
  sessionId?: string;
}
```

---

## ITokenPair

```typescript
interface ITokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}
```

---

## IAuthStrategy

Every authentication strategy must implement this interface.

```typescript
interface IAuthStrategy {
  readonly type: AuthMethod;
  readonly name: string;
  authenticate(payload: Record<string, unknown>, context?: ExecutionContext): Promise<IAuthResult>;
}
```

---

## AuthMethod enum

```typescript
enum AuthMethod {
  CREDENTIALS = 'credentials',
  OAUTH = 'oauth',
  TOTP = 'totp',
  ANONYMOUS = 'anonymous',
  MAGIC_LINK = 'magic-link',
  OTP = 'otp',
  PASSKEY = 'passkey',
  ONETAP = 'onetap',
  SSO = 'sso',
}
```

---

## IUserService

Consumer-provided user service. You **must** register a provider under the `'USER_SERVICE'` token (or a custom token via `userServiceToken`).

```typescript
interface IUserService {
  findById(id: string): Promise<IAuthUser | null>;
  findByEmail(email: string): Promise<IAuthUser | null>;
  findByUsername(username: string): Promise<IAuthUser | null>;
  findBySocialId(provider: string, socialId: string): Promise<IAuthUser | null>;
  create(data: Partial<IAuthUser> & { password?: string }): Promise<IAuthUser>;
  update(id: string, data: Partial<IAuthUser>): Promise<IAuthUser>;
  validatePassword(user: IAuthUser, password: string): Promise<boolean>;
  setPassword(id: string, passwordHash: string): Promise<void>;
  getTotpSecret(id: string): Promise<string | null>;
  setTotpSecret(id: string, secret: string): Promise<void>;
  getRoles(id: string): Promise<string[]>;
  getPermissions(id: string): Promise<string[]>;
}
```

### Method reference

| Method                         | Description                           |
| ------------------------------ | ------------------------------------- |
| `findById(id)`                 | Find user by ID                       |
| `findByEmail(email)`           | Find user by email                    |
| `findByUsername(username)`     | Find user by username                 |
| `findBySocialId(provider, id)` | Find user by OAuth/Social provider ID |
| `create(data)`                 | Create a new user account             |
| `update(id, data)`             | Update user fields                    |
| `validatePassword(user, pw)`   | Compare plaintext vs stored hash      |
| `setPassword(id, hash)`        | Store password hash                   |
| `getTotpSecret(id)`            | Retrieve stored TOTP secret           |
| `setTotpSecret(id, secret)`    | Persist new TOTP secret               |
| `getRoles(id)`                 | Get role identifiers for a user       |
| `getPermissions(id)`           | Get permission identifiers for a user |

---

## ICacheService

Minimal cache abstraction consumed internally. Compatible with `cache-manager` (from `@nestjs/cache-manager`), Keyv, or any custom wrapper.

```typescript
interface ICacheService {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T = unknown>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  reset(): Promise<void>;
}
```

---

## Policy types

### PolicyEffect

```typescript
type PolicyEffect = 'allow' | 'deny';
```

### PolicyStatement

A single policy statement (akin to AWS IAM).

```typescript
interface PolicyStatement {
  effect: PolicyEffect;
  actions: string[];
  resources: string[];
  condition?: Record<string, unknown>;
}
```

### PolicyDocument

A complete policy document assigned to a user or role.

```typescript
interface PolicyDocument {
  id?: string;
  name?: string;
  statements: PolicyStatement[];
}
```

### PolicyContext

Evaluation context passed to condition functions.

```typescript
interface PolicyContext {
  user: Record<string, unknown>;
  resource: Record<string, unknown>;
  environment: Record<string, unknown>;
}
```

### PolicyDecoratorOptions

```typescript
interface PolicyDecoratorOptions {
  action: string;
  resource: string | ((req: unknown) => string);
}
```

---

## IDeviceInfo

```typescript
interface IDeviceInfo {
  deviceId: string;
  userId: string;
  userAgent?: string;
  ip?: string;
  lastActivity: Date;
  createdAt: Date;
}
```
