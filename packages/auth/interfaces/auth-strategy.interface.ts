import type { ExecutionContext } from '@nestjs/common';
import type { IAuthResult } from './auth-result.interface.js';

/**
 * Authentication method enum — each value maps to a strategy.
 */
export enum AuthMethod {
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

/**
 * Every authentication strategy must implement this interface.
 * Strategies are registered in the IoC container and discovered by AuthGuard.
 */
export interface IAuthStrategy {
  /** Unique strategy type identifier */
  readonly type: AuthMethod;

  /** Human-readable strategy name for logging / debugging */
  readonly name: string;

  /**
   * Attempt to authenticate the request.
   *
   * @param payload  Strategy-specific authentication payload
   *                 (e.g. { email, password } for credentials,
   *                  { provider, code } for OAuth, …)
   * @param context  Optional NestJS execution context for
   *                 access to request / response objects
   */
  authenticate(payload: Record<string, unknown>, context?: ExecutionContext): Promise<IAuthResult>;
}
