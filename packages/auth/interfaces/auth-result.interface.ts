import type { IAuthUser } from './auth-user.interface.js';

/**
 * Pair of access and refresh tokens returned from successful authentication.
 */
export interface ITokenPair {
  /** Short-lived JWT access token (Bearer) */
  accessToken: string;
  /** Long-lived refresh token for rotating sessions */
  refreshToken: string;
  /** Access token TTL in seconds */
  expiresIn: number;
}

/**
 * Result returned by every authentication strategy on success.
 */
export interface IAuthResult {
  /** Authenticated user entity */
  user: IAuthUser;
  /** Token pair for subsequent requests */
  tokens: ITokenPair;
  /** Whether the user was just created (first sign-up) */
  isNewUser?: boolean;
  /** Whether the user must complete a second factor */
  isMfaRequired?: boolean;
  /** Server-generated session identifier */
  sessionId?: string;
}
