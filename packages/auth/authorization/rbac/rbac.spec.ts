import { RbacService } from './rbac.service';
import type { ICacheService, IAuthUser } from '../../interfaces';

describe('RbacService', () => {
  let service: RbacService;
  let mockCache: jest.Mocked<ICacheService>;

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };
    service = new RbacService(mockCache);
  });

  const adminUser: IAuthUser = {
    id: 'user-1',
    roles: ['admin', 'moderator'],
    permissions: [],
  };

  const regularUser: IAuthUser = {
    id: 'user-2',
    roles: ['user'],
    permissions: [],
  };

  describe('hasRoles', () => {
    it('should return true if user has one of the required roles', async () => {
      const result = await service.hasRoles(adminUser, ['admin']);
      expect(result).toBe(true);
    });

    it('should return false if user does not have required role', async () => {
      const result = await service.hasRoles(regularUser, ['admin']);
      expect(result).toBe(false);
    });

    it('should return true if no roles required', async () => {
      const result = await service.hasRoles(regularUser, []);
      expect(result).toBe(true);
    });

    it('should require all roles when requireAll is true', async () => {
      const result = await service.hasRoles(adminUser, ['admin', 'moderator'], true);
      expect(result).toBe(true);
    });

    it('should fail if missing one role with requireAll', async () => {
      const result = await service.hasRoles(adminUser, ['admin', 'super-admin'], true);
      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return false when cache returns no role permissions', async () => {
      mockCache.get.mockResolvedValue([]);
      const result = await service.hasPermission(adminUser, 'delete');
      expect(result).toBe(false);
    });
  });

  describe('invalidateUser', () => {
    it('should delete user role cache', async () => {
      await service.invalidateUser('user-1');
      expect(mockCache.del).toHaveBeenCalledWith('rbac:roles:user-1');
    });
  });

  describe('invalidateRole', () => {
    it('should delete role permission cache', async () => {
      await service.invalidateRole('admin');
      expect(mockCache.del).toHaveBeenCalledWith('rbac:perms:admin');
    });
  });
});
