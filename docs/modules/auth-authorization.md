# Auth — Authorization

> Role-Based Access Control (RBAC) and Policy-Based Access Control (PBAC).

---

## RBAC (Role-Based Access Control)

### Setup

Enable RBAC in the module config:

```typescript
AuthModule.forRoot({
  rbac: {
    rolesClaim: 'roles', // JWT claim holding role names
    requireRole: true, // fail if route has no @Roles()
  },
});
```

### Usage

Use `@Roles()` with `RbacGuard` on your routes:

```typescript
import { Roles, RbacGuard } from '@os.io/nest-kit/auth';

@Controller('admin')
@UseGuards(RbacGuard)
export class AdminController {
  @Get()
  @Roles('admin')
  list() {}

  @Delete(':id')
  @Roles('admin', 'super-admin', { requireAll: false })
  delete() {}
}
```

By default, a user needs **at least one** of the listed roles. Pass `{ requireAll: true }` to require all.

### RbacService

Programmatic access to role checking:

```typescript
import { RbacService } from '@os.io/nest-kit/auth';

// Check if user has specific roles
await rbacService.hasRoles(user, ['admin', 'moderator'], { requireAll: true });

// Check direct permission
await rbacService.hasPermission(user, 'users:delete');

// Get roles for a user
const roles = await rbacService.getUserRoles(userId);

// Get permissions for a role
const perms = await rbacService.getRolePermissions('admin');

// Invalidate cached data when roles change
await rbacService.invalidateUser(userId);
await rbacService.invalidateRole('admin');
```

### User service contract

Implement `IUserService.getRoles()` to return role names for a user:

```typescript
class YourUserService implements IUserService {
  async getRoles(id: string): Promise<string[]> {
    const user = await this.userRepo.findOneBy({ id });
    return user.roles.map((r) => r.name);
  }
}
```

---

## PBAC (Policy-Based Access Control)

### Setup

Enable PBAC in the module config:

```typescript
AuthModule.forRoot({
  pbac: {
    defaultEffect: 'deny-unless-permit', // or 'permit-unless-deny'
  },
});
```

### Usage

Use `@RequirePolicy()` with `PbacGuard` on your routes:

```typescript
import { RequirePolicy, PbacGuard } from '@os.io/nest-kit/auth';

@Controller('documents')
@UseGuards(PbacGuard)
export class DocumentController {
  @Get(':id')
  @RequirePolicy({ action: 'document:read', resource: 'doc:*' })
  read() {}

  @Delete(':id')
  @RequirePolicy({ action: 'document:delete', resource: (req) => `doc:${req.params.id}` })
  delete() {}
}
```

The `resource` can be:

- A static string: `'doc:*'`
- A function receiving the request: `(req) => \`doc:${req.params.id}\``

### Policy documents

Policies follow an AWS IAM-style structure:

```typescript
import type { PolicyDocument, PolicyStatement } from '@os.io/nest-kit/auth';

const policy: PolicyDocument = {
  statements: [
    { effect: 'allow', actions: ['document:*'], resources: ['doc:*'] },
    { effect: 'deny', actions: ['document:delete'], resources: ['doc:secret-*'] },
  ],
};
```

### Evaluation logic

1. If any statement matches with `effect: 'deny'` → **deny** (explicit deny always wins)
2. If any statement matches with `effect: 'allow'` → **allow**
3. Otherwise → apply `defaultEffect`

Supports wildcard matching (`*`) in both `actions` and `resources`.

### PbacService

Programmatic access to policy evaluation:

```typescript
import { PbacService } from '@os.io/nest-kit/auth';

// Evaluate policies directly
const allowed = await pbacService.evaluate(
  policies, // PolicyDocument[]
  'document:read', // action
  'doc:123', // resource
  { user: {}, resource: {}, environment: {} }, // context
);

// Get policies assigned to a user
const userPolicies = await pbacService.getUserPolicies(userId);

// Invalidate cached policies
await pbacService.invalidateUser(userId);
```

---

## Using both

RBAC and PBAC are independent. You can use them on different routes in the same application, or even combine them on the same route:

```typescript
@Controller('admin')
@UseGuards(RbacGuard, PbacGuard)
export class AdminController {
  @Delete(':id')
  @Roles('admin')
  @RequirePolicy({ action: 'admin:delete', resource: 'user:*' })
  delete() {}
}
```
