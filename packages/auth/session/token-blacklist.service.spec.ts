import { TokenBlacklistService } from './token-blacklist.service';
import type { ICacheService } from '../interfaces';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let mockCache: jest.Mocked<ICacheService>;

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };
    service = new TokenBlacklistService(mockCache);
  });

  describe('blacklistAccess', () => {
    it('should store token in cache with TTL', async () => {
      await service.blacklistAccess('jti-123', 3600);
      expect(mockCache.set).toHaveBeenCalledWith('tok_blk:jti-123', true, 3600);
    });
  });

  describe('isBlacklisted', () => {
    it('should return true if token is blacklisted', async () => {
      mockCache.get.mockResolvedValue(true);
      const result = await service.isBlacklisted('jti-123');
      expect(result).toBe(true);
    });

    it('should return false if token is not blacklisted', async () => {
      mockCache.get.mockResolvedValue(undefined);
      const result = await service.isBlacklisted('jti-456');
      expect(result).toBe(false);
    });
  });

  describe('revokeFamily / isFamilyRevoked', () => {
    it('should revoke a refresh token family', async () => {
      await service.revokeFamily('family-1', 86400);
      expect(mockCache.set).toHaveBeenCalledWith('rt_fam:family-1', true, 86400);
    });

    it('should detect a revoked family', async () => {
      mockCache.get.mockResolvedValue(true);
      const result = await service.isFamilyRevoked('family-1');
      expect(result).toBe(true);
    });
  });

  describe('remove', () => {
    it('should delete token from cache', async () => {
      await service.remove('jti-123');
      expect(mockCache.del).toHaveBeenCalledWith('tok_blk:jti-123');
    });
  });
});
