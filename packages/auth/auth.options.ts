import type { Provider, DynamicModule, Type } from '@nestjs/common';
import type { AuthMethod } from './interfaces';

// ──────── Method-specific options ────────

export interface CredentialsOptions {
  /** Enable email login (default true) */
  email?: boolean;
  /** Enable username login (default false) */
  username?: boolean;
  /** Require email verification before login (default false) */
  requireEmailVerification?: boolean;
}

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scopes?: string[];
  additionalParams?: Record<string, string>;
}

export interface OAuthOptions {
  google?: OAuthProviderConfig;
  github?: OAuthProviderConfig;
  facebook?: OAuthProviderConfig;
  apple?: OAuthProviderConfig;
  microsoft?: OAuthProviderConfig;
  discord?: OAuthProviderConfig;
  custom?: Record<string, OAuthProviderConfig>;
}

export interface TOTPOptions {
  /** Issuer name shown in authenticator apps (default "NestKit") */
  issuer?: string;
  /** Number of backup codes to generate (default 8) */
  backupCodeCount?: number;
  /** Algorithm: 'sha1' | 'sha256' | 'sha512' (default 'sha1') */
  algorithm?: 'sha1' | 'sha256' | 'sha512';
  /** Number of digits (default 6) */
  digits?: number;
  /** TOTP step window (seconds, default 30) */
  period?: number;
}

export interface AnonymousOptions {
  /** Prefix for anonymous user IDs (default "anon_") */
  idPrefix?: string;
  /** Whether anonymous sessions can be persisted (default true) */
  allowConversion?: boolean;
}

export interface MagicLinkOptions {
  /** Token expiry in seconds (default 900 / 15 min) */
  tokenExpiresIn?: number;
  /** Token length in bytes (default 32) */
  tokenBytes?: number;
}

export interface OTPOptions {
  /** OTP code length (default 6) */
  digits?: number;
  /** OTP expiry in seconds (default 300 / 5 min) */
  expiresIn?: number;
  /** Max allowed attempts before code is invalidated (default 3) */
  maxAttempts?: number;
}

export interface PasskeyOptions {
  /** Relying Party name (default "NestKit") */
  rpName?: string;
  /** Relying Party ID (default request hostname) */
  rpId?: string;
  /** Origin URL(s) allowed (default [request origin]) */
  origins?: string[];
  /** Timeout for WebAuthn ceremonies (ms, default 60000) */
  timeout?: number;
}

export interface OneTapOptions {
  google?: { clientId: string };
  apple?: { clientId: string; keyId: string; teamId: string; privateKey: string };
}

export interface SSOOptions {
  /** SAML providers */
  saml?: Record<string, SamlProviderConfig>;
  /** OIDC providers */
  oidc?: Record<string, OidcProviderConfig>;
}

export interface SamlProviderConfig {
  entryPoint: string;
  issuer: string;
  cert?: string;
  privateKey?: string;
  callbackUrl: string;
}

export interface OidcProviderConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scopes?: string[];
}

// ──────── Authorization options ────────

export interface RBACOptions {
  /** Key in JWT payload that holds roles (default "roles") */
  rolesClaim?: string;
  /** Whether to require at least one role on protected routes (default true) */
  requireRole?: boolean;
}

export interface PBACOptions {
  /** Policy evaluation mode (default "deny-unless-permit") */
  defaultEffect?: 'deny-unless-permit' | 'permit-unless-deny';
}

// ──────── Session options ────────

export interface SessionOptions {
  /** Access token TTL (default "15m") */
  accessTokenExpiresIn?: string;
  /** Refresh token TTL (default "7d") */
  refreshTokenExpiresIn?: string;
  /** JWT signing algorithm (default "HS256") */
  algorithm?: 'HS256' | 'RS256' | 'ES256';
  /** Custom issuer claim */
  issuer?: string;
  /** Custom audience claim */
  audience?: string;
  /** Blacklist TTL (seconds, default = refresh token TTL) */
  blacklistTtl?: number;
  /** Enable refresh token rotation (default true) */
  rotation?: boolean;
  /** Enable multi-device tracking (default false) */
  multiDevice?: boolean;
}

// ──────── API key options ────────

export interface ApiKeyOptions {
  /** HTTP header name (default `'X-API-Key'`) */
  headerName?: string;
  /** Allow API key via query parameter (default false) */
  queryParam?: string;
  /** Whether to attach the full IApiKey to `request.apiKey` (default true) */
  attachApiKey?: boolean;
}

// ──────── Rate limiting options ────────

export interface ThrottleOptions {
  /** Max login attempts per window (default 5) */
  maxAttempts?: number;
  /** Window duration in seconds (default 900 / 15 min) */
  windowSeconds?: number;
}

// ──────── Root module options ────────

export interface AuthModuleOptions {
  /** JWT secret (required for HS256, ignored for RS256/ES256) */
  jwtSecret?: string;
  /** Private key PEM (required for RS256/ES256) */
  jwtPrivateKey?: string;
  /** Public key PEM (required for RS256/ES256) */
  jwtPublicKey?: string;
  /** Bcrypt cost rounds (default 12) */
  passwordRounds?: number;

  // ── Providers ──
  /** Injection token for your cache-service provider (default 'CACHE_SERVICE') */
  cacheServiceToken?: string;
  /**
   * Injection token for your user-service provider (default 'USER_SERVICE').
   * The token must resolve to an object implementing IUserService.
   */
  userServiceToken?: string;

  // ── Extra providers ──
  /** Additional NestJS providers to register (e.g. your own services) */
  extraProviders?: Provider[];

  // ── Authentication methods ──
  credentials?: boolean | CredentialsOptions;
  oauth?: boolean | OAuthOptions;
  apiKey?: boolean | ApiKeyOptions;
  totp?: boolean | TOTPOptions;
  anonymous?: boolean | AnonymousOptions;
  magicLink?: boolean | MagicLinkOptions;
  otp?: boolean | OTPOptions;
  passkey?: boolean | PasskeyOptions;
  onetap?: boolean | OneTapOptions;
  sso?: boolean | SSOOptions;

  // ── Which methods are allowed on which routes ──
  /**
   * Override the default authentication method for routes.
   * If not set, AuthGuard uses the first enabled strategy.
   */
  defaultAuthMethod?: AuthMethod;

  // ── Authorization ──
  rbac?: boolean | RBACOptions;
  pbac?: boolean | PBACOptions;

  // ── Session ──
  session?: SessionOptions;

  // ── Security ──
  throttle?: ThrottleOptions;

  // ── Module scope ──
  global?: boolean;
}

export interface AuthModuleAsyncOptions {
  useFactory: (...args: unknown[]) => Promise<AuthModuleOptions> | AuthModuleOptions;
  inject?: (Type<unknown> | string | symbol)[];
  imports?: DynamicModule['imports'];
  extraProviders?: Provider[];
  global?: boolean;
}
