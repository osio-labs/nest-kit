import { DeviceSessionService } from './device-session.service';
import type { ICacheService } from '../interfaces';

describe('DeviceSessionService', () => {
  let service: DeviceSessionService;
  let mockCache: jest.Mocked<ICacheService>;

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };
    service = new DeviceSessionService(mockCache);
  });

  describe('register', () => {
    it('should store device session in cache', async () => {
      await service.register({
        deviceId: 'device-1',
        userId: 'user-1',
        userAgent: 'Mozilla/5.0',
        ip: '127.0.0.1',
        lastActivity: Date.now(),
      });

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('dev_sess:user-1:device-1'),
        expect.objectContaining({
          deviceId: 'device-1',
          userId: 'user-1',
        }),
        expect.any(Number),
      );
    });
  });

  describe('getSession', () => {
    it('should return session if exists', async () => {
      const session = {
        deviceId: 'device-1',
        userId: 'user-1',
        lastActivity: Date.now(),
        createdAt: Date.now(),
      };
      mockCache.get.mockResolvedValue(session);

      const result = await service.getSession('user-1', 'device-1');
      expect(result).toEqual(session);
    });

    it('should return null if session not found', async () => {
      mockCache.get.mockResolvedValue(undefined);
      const result = await service.getSession('user-1', 'unknown');
      expect(result).toBeNull();
    });
  });

  describe('removeSession', () => {
    it('should delete session from cache', async () => {
      await service.removeSession('user-1', 'device-1');
      expect(mockCache.del).toHaveBeenCalledWith('dev_sess:user-1:device-1');
    });
  });
});
