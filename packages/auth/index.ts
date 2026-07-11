/**
 * @os.io/nest-kit/auth
 *
 * Authentication & Authorization toolkit for NestJS applications.
 *
 * ## Features
 *
 * - **Authentication**: Credentials (email/password), OAuth (Google, GitHub,
 *   Facebook, Apple, Microsoft, Discord, custom), TOTP 2FA, Anonymous sessions,
 *   Magic Link, OTP (email/phone), Passkey (WebAuthn/FIDO2), OneTap (Google
 *   & Apple), SSO (SAML & OpenID Connect).
 * - **Authorization**: RBAC (Role-Based) and PBAC (Policy-Based) — use either
 *   or both independently on different routes.
 * - **Session**: Stateless JWT with refresh-token rotation, multi-device tracking,
 *   per-device logout (Telegram-style).
 * - **Security**: bcrypt password hashing, rate limiting, token blacklisting
 *   via Redis/Valkey, token versioning.
 * - **Scalability**: Horizontal scaling via shared cache; asymmetric JWT
 *   (RS256/ES256) enables service-to-service token validation without
 *   centralised auth calls.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { AuthModule } from '@os.io/nest-kit/auth';
 *
 * @Module({
 *   imports: [
 *     AuthModule.forRoot({
 *       jwtSecret: process.env.JWT_SECRET,
 *       credentials: true,
 *       rbac: true,
 *     }),
 *   ],
 *   providers: [
 *     { provide: 'USER_SERVICE', useClass: MyUserService },
 *     { provide: 'CACHE_SERVICE', useExisting: getCache() },
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @module
 * @packageDocumentation
 */

export { AuthModule } from './auth.module.js';
export { AuthService } from './auth.service.js';
export { AuthGuard } from './auth.guard.js';

// ── Constants ──
export {
  AUTH_MODULE_OPTIONS,
  CACHE_SERVICE,
  USER_SERVICE,
  AUTH_STRATEGIES,
  METADATA_PUBLIC,
  METADATA_ROLES,
  METADATA_PERMISSIONS,
  METADATA_POLICY,
} from './auth.constants.js';

// ── Options ──
export type {
  AuthModuleOptions,
  AuthModuleAsyncOptions,
  CredentialsOptions,
  OAuthOptions,
  OAuthProviderConfig,
  TOTPOptions,
  AnonymousOptions,
  MagicLinkOptions,
  OTPOptions,
  PasskeyOptions,
  OneTapOptions,
  SSOOptions,
  SamlProviderConfig,
  OidcProviderConfig,
  RBACOptions,
  PBACOptions,
  SessionOptions,
  ThrottleOptions,
} from './auth.options.js';

// ── Interfaces ──
export type {
  IAuthUser,
  IAuthRequest,
  ITokenPair,
  IAuthResult,
  IAuthStrategy,
  ICacheService,
  IUserService,
} from './interfaces/index.js';
export { AuthMethod } from './interfaces/index.js';

// ── Decorators ──
export { CurrentUser, Public } from './decorators/index.js';
export { ApiKeyProtected } from './api-key.decorator.js';

// ── Session ──
export { JwtService, TokenBlacklistService, DeviceSessionService } from './session/index.js';
export type { IDeviceInfo } from './session/index.js';

// ── Password ──
export { PasswordService } from './password/password.service.js';

// ── Throttling ──
export { ThrottleService } from './throttling/throttle.service.js';

// ── API Keys ──
export { ApiKeyGuard } from './api-key.guard.js';
export { API_KEY_STORE } from './api-key.constants.js';
export type { IApiKey, IApiKeyStore, ApiKeyOptions } from './api-key.types.js';

// ── Strategies ──
export {
  BaseStrategy,
  CredentialsStrategy,
  OAuthStrategy,
  OAuthProviderRegistry,
  TotpStrategy,
  AnonymousStrategy,
  MagicLinkStrategy,
  OtpStrategy,
  PasskeyStrategy,
  OneTapStrategy,
  SsoStrategy,
} from './strategies/index.js';

// ── Authorization ──
export { RbacService, RbacGuard, Roles } from './authorization/rbac/index.js';
export { PbacService, PbacGuard, RequirePolicy } from './authorization/pbac/index.js';
export type { PolicyDecoratorOptions } from './authorization/pbac/index.js';
export type {
  PolicyStatement,
  PolicyDocument,
  PolicyContext,
  PolicyEffect,
} from './authorization/pbac/index.js';
