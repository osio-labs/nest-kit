import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PbacService } from './pbac.service';
import { METADATA_POLICY } from '../../auth.constants';
import type { PolicyDecoratorOptions } from './pbac.decorator';
import type { PolicyContext } from './pbac.types';
import type { IAuthUser } from '../../interfaces';

/**
 * Guard that enforces Policy-Based Access Control.
 *
 * Reads the required policy from the `@RequirePolicy()` decorator
 * and evaluates it against the user's assigned policies.
 *
 * This guard is independent — you can use it with or without RBAC on
 * different routes in the same application.
 */
@Injectable()
export class PbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly pbacService: PbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyMeta = this.reflector.getAllAndOverride<PolicyDecoratorOptions>(METADATA_POLICY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!policyMeta) return true;

    const request = context.switchToHttp().getRequest<{
      user?: IAuthUser;
      params: Record<string, string>;
      query: Record<string, string>;
    }>();
    const user = request.user;
    if (!user) return false;

    const action = policyMeta.action;
    const resource =
      typeof policyMeta.resource === 'function'
        ? policyMeta.resource(request)
        : policyMeta.resource;

    const policies = await this.pbacService.getUserPolicies(user.id);

    const ctx: PolicyContext = {
      user: user,
      resource: { id: resource, ...request.params },
      environment: {},
    };

    return this.pbacService.evaluate(policies, action, resource, ctx);
  }
}
