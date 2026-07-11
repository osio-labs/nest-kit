import { Inject, Injectable } from '@nestjs/common';
import type { IAuthUser, ICacheService } from '../../interfaces/index.js';
import { CACHE_SERVICE } from '../../auth.constants.js';

/**
 * Service that resolves and caches role → permissions mappings.
 *
 * Cache key convention: `rbac:roles:<userId>` → string[]
 *                       `rbac:perms:<role>`    → string[]
 */
@Injectable()
export class RbacService {
  constructor(
    @Inject(CACHE_SERVICE)
    private readonly cache: ICacheService,
  ) {}

  /**
   * Check if a user has at least one of the required roles.
   *
   * @param user       Authenticated user
   * @param roles      List of role names required (at least one must match)
   * @param requireAll If true, the user must have ALL specified roles
   */
  async hasRoles(user: IAuthUser, roles: string[], requireAll = false): Promise<boolean> {
    if (!roles.length) return true;

    const userRoles = user.roles ?? (await this.getUserRoles(user.id));

    return requireAll
      ? roles.every((r) => userRoles.includes(r))
      : roles.some((r) => userRoles.includes(r));
  }

  /**
   * Check if a user has a specific permission (derived from their roles).
   *
   * @param user       Authenticated user
   * @param permission Permission identifier
   */
  async hasPermission(user: IAuthUser, permission: string): Promise<boolean> {
    const userRoles = user.roles ?? (await this.getUserRoles(user.id));

    for (const role of userRoles) {
      const perms = await this.getRolePermissions(role);
      if (perms.includes(permission)) return true;
    }

    return false;
  }

  /**
   * Fetch roles for a user, using cache when possible.
   */
  async getUserRoles(userId: string): Promise<string[]> {
    const cacheKey = `rbac:roles:${userId}`;
    const cached = await this.cache.get<string[]>(cacheKey);
    if (cached) return cached;
    return [];
  }

  /**
   * Fetch permissions for a role, using cache when possible.
   */
  async getRolePermissions(role: string): Promise<string[]> {
    const cacheKey = `rbac:perms:${role}`;
    const cached = await this.cache.get<string[]>(cacheKey);
    if (cached) return cached;
    return [];
  }

  /**
   * Invalidate the role cache for a user.
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.cache.del(`rbac:roles:${userId}`);
  }

  /**
   * Invalidate the permission cache for a role.
   */
  async invalidateRole(role: string): Promise<void> {
    await this.cache.del(`rbac:perms:${role}`);
  }
}
