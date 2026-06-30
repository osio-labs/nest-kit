import type { IAuthUser } from './auth-user.interface';

/**
 * Extended Express/NestJS request with authenticated user info.
 * Attached by AuthGuard after successful token validation.
 */
export interface IAuthRequest {
  /** Authenticated user entity */
  user?: IAuthUser;

  /** Raw access token from the request */
  accessToken?: string;

  /** Raw refresh token (if present in request) */
  refreshToken?: string;

  /** Device / session identifier for multi-device tracking */
  deviceId?: string;

  /** Session identifier */
  sessionId?: string;
}
