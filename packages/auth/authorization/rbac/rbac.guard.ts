import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from './rbac.service';
import { METADATA_ROLES } from '../../auth.constants';

/**
 * Guard that enforces Role-Based Access Control.
 *
 * Reads the required roles from the `@Roles()` decorator on the route
 * handler (or controller) and checks them against the authenticated user.
 *
 * This guard is independent — you can use it with or without PBAC on
 * different routes in the same application.
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<{
      roles: string[];
      requireAll: boolean;
    }>(METADATA_ROLES, [context.getHandler(), context.getClass()]);

    if (!meta || !meta.roles || meta.roles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: import('../../interfaces').IAuthUser }>();
    const user = request.user;

    if (!user) return false;

    return this.rbacService.hasRoles(user, meta.roles, meta.requireAll);
  }
}
