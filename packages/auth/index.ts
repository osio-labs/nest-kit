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

export { AuthModule } from './auth.module';
export { AuthService } from './auth.service';
export { AuthGuard } from './auth.guard';

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
} from './auth.constants';

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
} from './auth.options';

// ── Interfaces ──
export type {
  IAuthUser,
  IAuthRequest,
  ITokenPair,
  IAuthResult,
  IAuthStrategy,
  ICacheService,
  IUserService,
} from './interfaces';
export { AuthMethod } from './interfaces';

// ── Decorators ──
export { CurrentUser, Public } from './decorators';
export { ApiKeyProtected } from './api-key.decorator';

// ── Session ──
export { JwtService, TokenBlacklistService, DeviceSessionService } from './session';
export type { IDeviceInfo } from './session';

// ── Password ──
export { PasswordService } from './password/password.service';

// ── Throttling ──
export { ThrottleService } from './throttling/throttle.service';

// ── API Keys ──
export { ApiKeyGuard } from './api-key.guard';
export { API_KEY_STORE } from './api-key.constants';
export type { IApiKey, IApiKeyStore, ApiKeyOptions } from './api-key.types';

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
} from './strategies';

// ── Authorization ──
export { RbacService, RbacGuard, Roles } from './authorization/rbac';
export { PbacService, PbacGuard, RequirePolicy } from './authorization/pbac';
export type { PolicyDecoratorOptions } from './authorization/pbac';
export type {
  PolicyStatement,
  PolicyDocument,
  PolicyContext,
  PolicyEffect,
} from './authorization/pbac';
