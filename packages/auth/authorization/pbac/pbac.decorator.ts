import { SetMetadata } from '@nestjs/common';
import { METADATA_POLICY } from '../../auth.constants';

export interface PolicyDecoratorOptions {
  /** Action being performed (e.g. 'document:read') */
  action: string;
  /** Resource being accessed (e.g. 'org:123:doc:456') */
  resource: string | ((req: unknown) => string);
}

/**
 * Require a policy check on a route handler.
 * Works with the PbacGuard.
 *
 * @example
 * ```typescript
 * @RequirePolicy({ action: 'document:delete', resource: 'org:*' })
 * @RequirePolicy({ action: 'document:read', resource: (req) => req.params.docId })
 * ```
 */
export const RequirePolicy = (options: PolicyDecoratorOptions) =>
  SetMetadata(METADATA_POLICY, options);
