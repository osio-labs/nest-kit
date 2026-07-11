import { SetMetadata } from '@nestjs/common';
import { METADATA_ROLES } from '../../auth.constants.js';

/**
 * Require specific roles to access a route.
 * Works with the RbacGuard.
 *
 * By default, a user needs **at least one** of the listed roles.
 * Pass `{ requireAll: true }` in options to require all roles.
 *
 * @example
 * ```typescript
 * @Roles('admin')
 * @Roles('admin', 'moderator')
 * @Roles('admin', 'super-admin', { requireAll: true })
 * ```
 */
export const Roles = (...args: (string | { requireAll: boolean })[]) => {
  const last = args[args.length - 1];
  const opts = typeof last === 'object' ? (args.pop() as { requireAll: boolean }) : undefined;
  return SetMetadata(METADATA_ROLES, {
    roles: args as string[],
    requireAll: opts?.requireAll ?? false,
  });
};
