import { ThrottleService } from './throttle.service.js';
import type { ICacheService } from '../interfaces/index.js';

describe('ThrottleService', () => {
  let service: ThrottleService;
  let mockCache: jest.Mocked<ICacheService>;

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };
    service = new ThrottleService(mockCache);
  });

  describe('check', () => {
    it('should not throw if under limit', async () => {
      mockCache.get.mockResolvedValue(3);
      await expect(service.check('user@test.com', 5, 900)).resolves.toBeUndefined();
    });

    it('should throw if over limit', async () => {
      mockCache.get.mockResolvedValue(5);
      await expect(service.check('user@test.com', 5, 900)).rejects.toThrow(
        'Too many login attempts',
      );
    });

    it('should not throw if no attempts recorded', async () => {
      mockCache.get.mockResolvedValue(undefined);
      await expect(service.check('user@test.com', 5, 900)).resolves.toBeUndefined();
    });
  });

  describe('recordFailure', () => {
    it('should increment attempt counter', async () => {
      mockCache.get.mockResolvedValue(2);
      await service.recordFailure('user@test.com', 900);
      expect(mockCache.set).toHaveBeenCalledWith('login_attempt:user@test.com', 3, 900);
    });

    it('should start at 1 if no previous attempts', async () => {
      mockCache.get.mockResolvedValue(undefined);
      await service.recordFailure('user@test.com', 900);
      expect(mockCache.set).toHaveBeenCalledWith('login_attempt:user@test.com', 1, 900);
    });
  });

  describe('clear', () => {
    it('should delete attempt counter', async () => {
      await service.clear('user@test.com');
      expect(mockCache.del).toHaveBeenCalledWith('login_attempt:user@test.com');
    });
  });
});
