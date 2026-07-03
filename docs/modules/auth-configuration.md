# Auth — Configuration

> All configuration options for the auth module.

---

## AuthModuleOptions

```typescript
AuthModule.forRoot({
  // ── JWT ──
  jwtSecret: 'your-secret', // HS256 (required for HMAC)
  jwtPrivateKey: '...', // RS256/ES256 PEM
  jwtPublicKey: '...', // RS256/ES256 PEM
  passwordRounds: 12, // bcrypt cost

  // ── Provider tokens ──
  cacheServiceToken: 'CACHE_SERVICE',
  userServiceToken: 'USER_SERVICE',
  extraProviders: [],

  // ── Strategies (boolean or options) ──
  apiKey: false,
  credentials: true,
  oauth: false,
  totp: false,
  anonymous: false,
  magicLink: false,
  otp: false,
  passkey: false,
  onetap: false,
  sso: false,

  // ── Authorization ──
  rbac: false,
  pbac: false,

  // ── Session ──
  session: {
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
    algorithm: 'HS256',
    issuer: 'my-app',
    audience: 'my-app',
    blacklistTtl: 604800,
    rotation: true,
    multiDevice: false,
  },

  // ── Security ──
  throttle: {
    maxAttempts: 5,
    windowSeconds: 900,
  },

  // ── Module ──
  defaultAuthMethod: AuthMethod.CREDENTIALS,
  global: true,
});
```

### Root options

| Option              | Type         | Default           | Description                      |
| ------------------- | ------------ | ----------------- | -------------------------------- |
| `jwtSecret`         | `string`     | —                 | JWT secret (HS256)               |
| `jwtPrivateKey`     | `string`     | —                 | Private key PEM (RS256/ES256)    |
| `jwtPublicKey`      | `string`     | —                 | Public key PEM (RS256/ES256)     |
| `passwordRounds`    | `number`     | `12`              | Bcrypt cost factor               |
| `cacheServiceToken` | `string`     | `'CACHE_SERVICE'` | Injection token for cache        |
| `userServiceToken`  | `string`     | `'USER_SERVICE'`  | Injection token for user service |
| `global`            | `boolean`    | `true`            | Register module as global        |
| `defaultAuthMethod` | `AuthMethod` | —                 | Override default auth method     |
| `extraProviders`    | `Provider[]` | —                 | Additional DI providers          |

### Strategy toggles

| Option        | Type                            | Description             |
| ------------- | ------------------------------- | ----------------------- |
| `apiKey`      | `boolean \| ApiKeyOptions`      | API key authentication  |
| `credentials` | `boolean \| CredentialsOptions` | Email/password auth     |
| `oauth`       | `boolean \| OAuthOptions`       | OAuth 2.0 providers     |
| `totp`        | `boolean \| TOTPOptions`        | TOTP 2FA                |
| `anonymous`   | `boolean \| AnonymousOptions`   | Anonymous sessions      |
| `magicLink`   | `boolean \| MagicLinkOptions`   | Passwordless magic link |
| `otp`         | `boolean \| OTPOptions`         | One-time password       |
| `passkey`     | `boolean \| PasskeyOptions`     | WebAuthn passkeys       |
| `onetap`      | `boolean \| OneTapOptions`      | Google & Apple OneTap   |
| `sso`         | `boolean \| SSOOptions`         | SAML2 & OpenID Connect  |

### Authorization toggles

| Option | Type                     | Description        |
| ------ | ------------------------ | ------------------ |
| `rbac` | `boolean \| RBACOptions` | RBAC authorization |
| `pbac` | `boolean \| PBACOptions` | PBAC authorization |

---

## Strategy-specific options

### CredentialsOptions

| Option                     | Type      | Default | Description                      |
| -------------------------- | --------- | ------- | -------------------------------- |
| `email`                    | `boolean` | `true`  | Enable email login               |
| `username`                 | `boolean` | `false` | Enable username login            |
| `requireEmailVerification` | `boolean` | `false` | Block login until email verified |

### OAuthOptions / OAuthProviderConfig

```typescript
{
  google: { clientId: '...', clientSecret: '...', callbackUrl: '...' },
  github: { clientId: '...', clientSecret: '...', callbackUrl: '...' },
  facebook: { clientId: '...', clientSecret: '...', callbackUrl: '...' },
  apple: { clientId: '...', clientSecret: '...', callbackUrl: '...' },
  microsoft: { clientId: '...', clientSecret: '...', callbackUrl: '...' },
  discord: { clientId: '...', clientSecret: '...', callbackUrl: '...' },
  custom: {
    'my-provider': { clientId: '...', clientSecret: '...', callbackUrl: '...' },
  },
}
```

Each provider config:

| Option             | Type                     | Description             |
| ------------------ | ------------------------ | ----------------------- |
| `clientId`         | `string`                 | OAuth client ID         |
| `clientSecret`     | `string`                 | OAuth client secret     |
| `callbackUrl`      | `string`                 | Redirect URL after auth |
| `scopes`           | `string[]`               | Requested scopes        |
| `additionalParams` | `Record<string, string>` | Extra query params      |

### TOTPOptions

| Option            | Type                             | Default   | Description                |
| ----------------- | -------------------------------- | --------- | -------------------------- |
| `issuer`          | `string`                         | `NestKit` | Name in authenticator apps |
| `backupCodeCount` | `number`                         | `8`       | Number of backup codes     |
| `algorithm`       | `'sha1' \| 'sha256' \| 'sha512'` | `'sha1'`  | Hash algorithm             |
| `digits`          | `number`                         | `6`       | Code length                |
| `period`          | `number`                         | `30`      | TOTP step window (seconds) |

### AnonymousOptions

| Option            | Type      | Default   | Description                              |
| ----------------- | --------- | --------- | ---------------------------------------- |
| `idPrefix`        | `string`  | `'anon_'` | Prefix for anonymous user IDs            |
| `allowConversion` | `boolean` | `true`    | Allow anonymous sessions to be persisted |

### MagicLinkOptions

| Option           | Type     | Default | Description                 |
| ---------------- | -------- | ------- | --------------------------- |
| `tokenExpiresIn` | `number` | `900`   | Token TTL (seconds, 15 min) |
| `tokenBytes`     | `number` | `32`    | Random token length         |

### OTPOptions

| Option        | Type     | Default | Description                       |
| ------------- | -------- | ------- | --------------------------------- |
| `digits`      | `number` | `6`     | Code length                       |
| `expiresIn`   | `number` | `300`   | Code TTL (seconds, 5 min)         |
| `maxAttempts` | `number` | `3`     | Max failed attempts before expiry |

### ApiKeyOptions

| Option         | Type      | Default       | Description                             |
| -------------- | --------- | ------------- | --------------------------------------- |
| `headerName`   | `string`  | `'X-API-Key'` | HTTP header for the API key             |
| `queryParam`   | `string`  | —             | Allow API key via query parameter       |
| `attachApiKey` | `boolean` | `true`        | Attach full IApiKey to `request.apiKey` |

### PasskeyOptions

| Option    | Type       | Default          | Description           |
| --------- | ---------- | ---------------- | --------------------- |
| `rpName`  | `string`   | `'NestKit'`      | Relying Party name    |
| `rpId`    | `string`   | request hostname | Relying Party ID      |
| `origins` | `string[]` | [request origin] | Allowed origin URLs   |
| `timeout` | `number`   | `60000`          | Ceremony timeout (ms) |

### OneTapOptions

```typescript
{
  google: { clientId: '...' },
  apple: { clientId: '...', keyId: '...', teamId: '...', privateKey: '...' },
}
```

### SSOOptions

```typescript
{
  saml: {
    'my-saml': {
      entryPoint: 'https://idp.example.com/sso',
      issuer: 'https://my-app.example.com',
      cert: '...',
      privateKey: '...',
      callbackUrl: 'https://my-app.example.com/auth/saml/callback',
    },
  },
  oidc: {
    'my-oidc': {
      issuerUrl: 'https://accounts.example.com',
      clientId: '...',
      clientSecret: '...',
      callbackUrl: 'https://my-app.example.com/auth/oidc/callback',
      scopes: ['openid', 'profile', 'email'],
    },
  },
}
```

#### SamlProviderConfig

| Option        | Type     | Description                |
| ------------- | -------- | -------------------------- |
| `entryPoint`  | `string` | IdP SSO URL                |
| `issuer`      | `string` | SP entity ID               |
| `cert`        | `string` | IdP certificate (optional) |
| `privateKey`  | `string` | SP private key (optional)  |
| `callbackUrl` | `string` | ACS callback URL           |

#### OidcProviderConfig

| Option         | Type       | Description         |
| -------------- | ---------- | ------------------- |
| `issuerUrl`    | `string`   | OIDC issuer URL     |
| `clientId`     | `string`   | OAuth client ID     |
| `clientSecret` | `string`   | OAuth client secret |
| `callbackUrl`  | `string`   | Redirect URL        |
| `scopes`       | `string[]` | Requested scopes    |

---

## Session & security options

### SessionOptions

| Option                  | Type                            | Default     | Description                   |
| ----------------------- | ------------------------------- | ----------- | ----------------------------- |
| `accessTokenExpiresIn`  | `string`                        | `'15m'`     | Access token TTL              |
| `refreshTokenExpiresIn` | `string`                        | `'7d'`      | Refresh token TTL             |
| `algorithm`             | `'HS256' \| 'RS256' \| 'ES256'` | `'HS256'`   | JWT signing algorithm         |
| `issuer`                | `string`                        | —           | JWT `iss` claim               |
| `audience`              | `string`                        | —           | JWT `aud` claim               |
| `blacklistTtl`          | `number`                        | refresh TTL | Blacklist entry TTL (seconds) |
| `rotation`              | `boolean`                       | `true`      | Refresh token rotation        |
| `multiDevice`           | `boolean`                       | `false`     | Multi-device session tracking |

### ThrottleOptions

| Option          | Type     | Default | Description                   |
| --------------- | -------- | ------- | ----------------------------- |
| `maxAttempts`   | `number` | `5`     | Max login attempts per window |
| `windowSeconds` | `number` | `900`   | Window duration (seconds)     |

---

## Authorization options

### RBACOptions

| Option        | Type      | Default   | Description                   |
| ------------- | --------- | --------- | ----------------------------- |
| `rolesClaim`  | `string`  | `'roles'` | JWT claim holding role names  |
| `requireRole` | `boolean` | `true`    | Fail if route has no @Roles() |

### PBACOptions

| Option          | Type                                           | Default                |
| --------------- | ---------------------------------------------- | ---------------------- |
| `defaultEffect` | `'deny-unless-permit' \| 'permit-unless-deny'` | `'deny-unless-permit'` |

---

## Async configuration

```typescript
AuthModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    jwtSecret: configService.get('JWT_SECRET'),
    credentials: true,
    rbac: true,
  }),
  inject: [ConfigService],
  imports: [ConfigModule],
});
```

| Option           | Type                           | Description                  |
| ---------------- | ------------------------------ | ---------------------------- |
| `useFactory`     | `Function`                     | Factory returning options    |
| `inject`         | `(Type \| string \| symbol)[]` | Dependencies for factory     |
| `imports`        | `DynamicModule['imports']`     | Additional modules to import |
| `extraProviders` | `Provider[]`                   | Extra providers              |
| `global`         | `boolean`                      | Register as global module    |
