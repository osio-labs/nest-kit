import type { IAuthUser } from './auth-user.interface.js';

/**
 * Consumer-provided user service.
 * You must register a provider under the `'USER_SERVICE'` token.
 */
export interface IUserService {
  /** Find a user by their unique ID */
  findById(id: string): Promise<IAuthUser | null>;

  /** Find a user by email address */
  findByEmail(email: string): Promise<IAuthUser | null>;

  /** Find a user by username */
  findByUsername(username: string): Promise<IAuthUser | null>;

  /** Find a user by a social / OAuth provider ID */
  findBySocialId(provider: string, socialId: string): Promise<IAuthUser | null>;

  /** Create a new user account */
  create(data: Partial<IAuthUser> & { password?: string }): Promise<IAuthUser>;

  /** Update user fields */
  update(id: string, data: Partial<IAuthUser>): Promise<IAuthUser>;

  /** Compare a plaintext password against the stored hash */
  validatePassword(user: IAuthUser, password: string): Promise<boolean>;

  /** Store / overwrite the password hash for a user */
  setPassword(id: string, passwordHash: string): Promise<void>;

  /** Retrieve the stored TOTP secret (null if 2FA not configured) */
  getTotpSecret(id: string): Promise<string | null>;

  /** Persist a new TOTP secret (e.g. after enrollment) */
  setTotpSecret(id: string, secret: string): Promise<void>;

  /** Get the list of role identifiers assigned to a user */
  getRoles(id: string): Promise<string[]>;

  /** Get the list of permission identifiers assigned to a user */
  getPermissions(id: string): Promise<string[]>;
}
