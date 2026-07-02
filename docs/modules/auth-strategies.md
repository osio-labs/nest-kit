# Auth — Authentication Strategies

> All strategies implement `IAuthStrategy` and are registered conditionally by `AuthModule`. Use `AuthService.authenticate(method, payload)` to invoke a strategy.

---

## AuthMethod enum

| Value         | Strategy            | Description                     |
| ------------- | ------------------- | ------------------------------- |
| `CREDENTIALS` | CredentialsStrategy | Email/username + password       |
| `OAUTH`       | OAuthStrategy       | OAuth 2.0 (Google, GitHub, …)   |
| `TOTP`        | TotpStrategy        | TOTP two-factor authentication  |
| `ANONYMOUS`   | AnonymousStrategy   | Temporary anonymous sessions    |
| `MAGIC_LINK`  | MagicLinkStrategy   | Passwordless email magic links  |
| `OTP`         | OtpStrategy         | One-time password (email/phone) |
| `PASSKEY`     | PasskeyStrategy     | WebAuthn / FIDO2 passkeys       |
| `ONETAP`      | OneTapStrategy      | Google & Apple OneTap           |
| `SSO`         | SsoStrategy         | SAML2 & OpenID Connect          |

---

## Credentials

```typescript
import { AuthService, AuthMethod } from '@os.io/nest-kit/auth';

const result = await authService.authenticate(AuthMethod.CREDENTIALS, {
  email: 'user@example.com',
  password: 'secret123',
});
```

Validates credentials against your `IUserService.validatePassword()`. Supports email and/or username login. Optionally requires email verification before allowing login.

**Peer dependency:** none (uses `bcrypt` via `PasswordService` if enabled).

---

## OAuth

```typescript
const result = await authService.authenticate(AuthMethod.OAUTH, {
  provider: 'google',
  code: 'authorization-code',
  redirectUri: 'https://my-app.com/auth/callback',
});
```

Uses `OAuthProviderRegistry` to manage provider configs. Exchanges authorization codes for tokens, looks up or creates users via `IUserService.findBySocialId()`.

**Peer dependency:** none.

---

## TOTP (2FA)

```typescript
import { TotpStrategy } from '@os.io/nest-kit/auth';

// Enrollment
const { secret, otpauthUrl } = await totpStrategy.enroll(userId);

// Verification
const result = await authService.authenticate(AuthMethod.TOTP, {
  userId: 'user-123',
  token: '123456',
});
```

Supports enrollment (generating secret + otpauth URL), code verification, and backup codes. Sets `isMfaVerified` on the token.

**Peer dependency:** `npm install otpauth`

---

## Anonymous

```typescript
const result = await authService.authenticate(AuthMethod.ANONYMOUS, {
  deviceId: 'device-xyz',
  userAgent: 'Mozilla/5.0 ...',
});
```

Creates a temporary identity with a unique anonymous ID (e.g. `anon_a1b2c3d4`). Sessions can be converted to permanent accounts later.

**Peer dependency:** none.

---

## Magic Link

```typescript
// Step 1: Request a link
await authService.authenticate(AuthMethod.MAGIC_LINK, {
  email: 'user@example.com',
  action: 'request',
});

// Step 2: Authenticate with the token from the email
const result = await authService.authenticate(AuthMethod.MAGIC_LINK, {
  email: 'user@example.com',
  token: 'received-token',
  action: 'authenticate',
});
```

Passwordless email login. Token is stored in cache, one-time use, configurable expiry (default 15 min).

**Peer dependency:** none.

---

## OTP

```typescript
// Step 1: Request a code
await authService.authenticate(AuthMethod.OTP, {
  email: 'user@example.com',
  action: 'request',
});

// Step 2: Verify the code
const result = await authService.authenticate(AuthMethod.OTP, {
  email: 'user@example.com',
  code: '123456',
  action: 'authenticate',
});
```

Numeric one-time password sent via email or phone. Enforces max attempts (default 3) before invalidating the code.

**Peer dependency:** none.

---

## Passkey (WebAuthn)

```typescript
import { PasskeyStrategy } from '@os.io/nest-kit/auth';

// Registration
const options = await passkeyStrategy.generateRegistrationOptions(userId);

// Assertion
const result = await passkeyStrategy.verifyRegistrationResponse(userId, credential);

// Authentication
const result = await authService.authenticate(AuthMethod.PASSKEY, {
  credential: authenticatorAssertionResponse,
});
```

FIDO2 WebAuthn passkeys. Uses `@simplewebauthn/server` for ceremony flows. Configurable Relying Party name, ID, and allowed origins.

**Peer dependency:** `npm install @simplewebauthn/server`

---

## OneTap

```typescript
// Google OneTap
const result = await authService.authenticate(AuthMethod.ONETAP, {
  provider: 'google',
  credential: 'google-id-token',
});

// Apple OneTap
const result = await authService.authenticate(AuthMethod.ONETAP, {
  provider: 'apple',
  credential: 'apple-identity-token',
});
```

Google & Apple OneTap sign-in. Accepts an ID token from the client-side OneTap flow and looks up or creates the user via `IUserService.findBySocialId()`.

**Peer dependency:** none.

---

## SSO

```typescript
// SAML
const result = await authService.authenticate(AuthMethod.SSO, {
  provider: 'my-saml',
  samlResponse: 'base64-encoded-saml-response',
});

// OIDC
const result = await authService.authenticate(AuthMethod.SSO, {
  provider: 'my-oidc',
  idToken: 'jwt-id-token',
});
```

Enterprise SSO via SAML2 and OpenID Connect. Supports multiple providers of each type. SAML responses are base64 XML; OIDC uses JWT ID tokens.

**Peer dependency:** none.

---

## Custom strategy

Implement `IAuthStrategy` and register it manually:

```typescript
import { IAuthStrategy, AuthMethod, IAuthResult } from '@os.io/nest-kit/auth';

class CustomStrategy implements IAuthStrategy {
  readonly type = AuthMethod.CREDENTIALS; // or use a custom value
  readonly name = 'custom';

  async authenticate(payload: Record<string, unknown>): Promise<IAuthResult> {
    // your logic
  }
}
```

Register via `extraProviders` in `AuthModule.forRoot()` or with a custom injection token.
