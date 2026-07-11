import { PbacService } from './pbac.service.js';
import type { ICacheService } from '../../interfaces/index.js';
import type { PolicyDocument, PolicyContext } from './pbac.types.js';

describe('PbacService', () => {
  let service: PbacService;
  let mockCache: jest.Mocked<ICacheService>;

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };
    service = new PbacService(mockCache);
  });

  const context: PolicyContext = {
    user: { id: 'user-1', department: 'engineering' },
    resource: { id: 'doc-1' },
    environment: {},
  };

  describe('evaluate', () => {
    it('should allow when a matching allow statement exists', async () => {
      const policies: PolicyDocument[] = [
        {
          statements: [
            {
              effect: 'allow',
              actions: ['document:read'],
              resources: ['doc-*'],
            },
          ],
        },
      ];

      const result = await service.evaluate(policies, 'document:read', 'doc-1', context);
      expect(result).toBe(true);
    });

    it('should deny when a matching deny statement exists', async () => {
      const policies: PolicyDocument[] = [
        {
          statements: [
            {
              effect: 'deny',
              actions: ['document:delete'],
              resources: ['*'],
            },
          ],
        },
      ];

      const result = await service.evaluate(policies, 'document:delete', 'doc-1', context);
      expect(result).toBe(false);
    });

    it('should deny when no matching statement (deny-unless-permit)', async () => {
      const policies: PolicyDocument[] = [
        {
          statements: [
            {
              effect: 'allow',
              actions: ['document:read'],
              resources: ['doc-*'],
            },
          ],
        },
      ];

      const result = await service.evaluate(policies, 'document:write', 'doc-1', context);
      expect(result).toBe(false);
    });

    it('should deny overrides allow', async () => {
      const policies: PolicyDocument[] = [
        {
          statements: [
            { effect: 'allow', actions: ['*'], resources: ['*'] },
            {
              effect: 'deny',
              actions: ['document:delete'],
              resources: ['doc-*'],
            },
          ],
        },
      ];

      const result = await service.evaluate(policies, 'document:delete', 'doc-1', context);
      expect(result).toBe(false);
    });

    it('should handle wildcard patterns', async () => {
      const policies: PolicyDocument[] = [
        {
          statements: [
            {
              effect: 'allow',
              actions: ['*'],
              resources: ['org:*:doc:*'],
            },
          ],
        },
      ];

      const result = await service.evaluate(policies, 'document:read', 'org:123:doc:456', context);
      expect(result).toBe(true);
    });
  });

  describe('getUserPolicies', () => {
    it('should return cached policies', async () => {
      const policies: PolicyDocument[] = [
        { statements: [{ effect: 'allow', actions: ['*'], resources: ['*'] }] },
      ];
      mockCache.get.mockResolvedValue(policies);

      const result = await service.getUserPolicies('user-1');
      expect(result).toEqual(policies);
    });

    it('should return empty array when no policies cached', async () => {
      mockCache.get.mockResolvedValue(undefined);
      const result = await service.getUserPolicies('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('invalidateUser', () => {
    it('should delete policy cache', async () => {
      await service.invalidateUser('user-1');
      expect(mockCache.del).toHaveBeenCalledWith('pbac:policies:user-1');
    });
  });
});
