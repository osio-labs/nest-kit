import type { RateLimitAdapter, RateLimitModuleOptions } from './rate-limit.types';
import { RATE_LIMIT_ADAPTER, RATE_LIMIT_MODULE_OPTIONS } from './rate-limit.constants';
import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  let service: RateLimitService;
  const mockAdapter: jest.Mocked<RateLimitAdapter> = {
    consume: jest.fn(),
    reset: jest.fn(),
  };
  const options: RateLimitModuleOptions = {
    adapter: mockAdapter,
    defaultLimit: 50,
    defaultWindowSeconds: 30,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RateLimitService(mockAdapter, options);
  });

  describe('consume', () => {
    it('should delegate to adapter with defaults', async () => {
      mockAdapter.consume.mockResolvedValue({
        allowed: true,
        remaining: 49,
        resetTime: Date.now() + 30000,
        total: 50,
      });

      const result = await service.consume('test-key');

      expect(mockAdapter.consume).toHaveBeenCalledWith('test-key', 50, 30);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(49);
    });

    it('should override limit and window', async () => {
      mockAdapter.consume.mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 10000,
        total: 10,
      });

      const result = await service.consume('test-key', 10, 10);

      expect(mockAdapter.consume).toHaveBeenCalledWith('test-key', 10, 10);
      expect(result.total).toBe(10);
    });

    it('should use hardcoded defaults when options not set', async () => {
      service = new RateLimitService(mockAdapter, { adapter: mockAdapter });

      mockAdapter.consume.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        total: 100,
      });

      await service.consume('test-key');

      expect(mockAdapter.consume).toHaveBeenCalledWith('test-key', 100, 60);
    });
  });

  describe('reset', () => {
    it('should delegate to adapter', async () => {
      await service.reset('test-key');
      expect(mockAdapter.reset).toHaveBeenCalledWith('test-key');
    });
  });
});
