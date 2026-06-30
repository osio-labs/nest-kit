/**
 * Represents an authenticated user across the system.
 * This interface is used inside JWT payloads, request objects, and guards.
 */
export interface IAuthUser {
  /** Unique user identifier (UUID or numeric ID as string) */
  id: string;

  /** Email address (may be absent for anonymous users) */
  email?: string;

  /** Phone number (may be absent) */
  phone?: string;

  /** Username or display name */
  username?: string;

  /** Assigned roles for RBAC */
  roles?: string[];

  /** Direct permissions for simple permission checks */
  permissions?: string[];

  /** Whether this is an anonymous session */
  isAnonymous?: boolean;

  /** Whether the user has passed 2FA in this session */
  isMfaVerified?: boolean;

  /** Custom claims bag for extensibility */
  [key: string]: unknown;
}
