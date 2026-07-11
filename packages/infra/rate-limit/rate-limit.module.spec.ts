import { Test } from '@nestjs/testing';
import { RATE_LIMIT_ADAPTER, RATE_LIMIT_MODULE_OPTIONS } from './rate-limit.constants.js';
import { RateLimitModule } from './rate-limit.module.js';
import { RateLimitService } from './rate-limit.service.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import type { RateLimitAdapter } from './rate-limit.types.js';

describe('RateLimitModule', () => {
  const mockAdapter: RateLimitAdapter = {
    consume: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60000,
      total: 100,
    }),
    reset: jest.fn(),
  };

  describe('forRoot', () => {
    it('should create a module with the provided adapter', async () => {
      const modRef = await Test.createTestingModule({
        imports: [RateLimitModule.forRoot({ adapter: mockAdapter })],
      }).compile();

      const svc = modRef.get(RateLimitService);
      expect(svc).toBeInstanceOf(RateLimitService);

      const guard = modRef.get(RateLimitGuard);
      expect(guard).toBeInstanceOf(RateLimitGuard);
    });

    it('should be global by default', async () => {
      const mod = RateLimitModule.forRoot({ adapter: mockAdapter });
      expect(mod.global).toBe(true);
    });

    it('should respect global: false', async () => {
      const mod = RateLimitModule.forRoot({ adapter: mockAdapter, global: false });
      expect(mod.global).toBe(false);
    });
  });

  describe('forRootAsync', () => {
    it('should create module via useFactory', async () => {
      const modRef = await Test.createTestingModule({
        imports: [
          RateLimitModule.forRootAsync({
            useFactory: () => ({ adapter: mockAdapter }),
          }),
        ],
      }).compile();

      const svc = modRef.get(RateLimitService);
      expect(svc).toBeInstanceOf(RateLimitService);
    });

    it('should throw if adapter is missing', async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            RateLimitModule.forRootAsync({
              useFactory: () => ({ adapter: undefined! }),
            }),
          ],
        }).compile(),
      ).rejects.toThrow('RateLimitModule requires an adapter');
    });
  });
});
