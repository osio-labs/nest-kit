import type { RateLimitAdapter } from './rate-limit.types';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';
import { METADATA_RATE_LIMIT } from './rate-limit.constants';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let mockService: jest.Mocked<RateLimitService>;
  let mockReflector: { getAllAndOverride: jest.Mock };

  const mockResponse = () => {
    const res: any = {};
    res.setHeader = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    const mockAdapter: RateLimitAdapter = {
      consume: jest.fn(),
      reset: jest.fn(),
    };
    mockService = new RateLimitService(mockAdapter, {
      adapter: mockAdapter,
    }) as jest.Mocked<RateLimitService>;
    mockService.consume = jest.fn();

    mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };

    guard = new RateLimitGuard(mockReflector as any, mockService);
  });

  it('should allow request within limit', async () => {
    mockService.consume.mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60000,
      total: 100,
    });

    const res = mockResponse();
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ ip: '127.0.0.1', connection: {} }),
        getResponse: () => res,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 99);
  });

  it('should block when limit exceeded', async () => {
    mockService.consume.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      total: 3,
    });

    const res = mockResponse();
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ ip: '127.0.0.1', connection: {} }),
        getResponse: () => res,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    await expect(guard.canActivate(ctx)).rejects.toThrow('Too many requests');
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });

  it('should use custom error message', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      limit: 1,
      windowSeconds: 60,
      errorMessage: 'Custom rate limit message',
    });

    mockService.consume.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      total: 1,
    });

    const res = mockResponse();
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ ip: '127.0.0.1', connection: {} }),
        getResponse: () => res,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    await expect(guard.canActivate(ctx)).rejects.toThrow('Custom rate limit message');
  });

  it('should use custom keyGenerator', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      limit: 10,
      windowSeconds: 60,
      keyGenerator: () => 'custom-key',
    });

    mockService.consume.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetTime: Date.now() + 60000,
      total: 10,
    });

    const res = mockResponse();
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ ip: '127.0.0.1' }),
        getResponse: () => res,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    await guard.canActivate(ctx);
    expect(mockService.consume).toHaveBeenCalledWith('custom-key', 10, 60);
  });

  it('should set rate limit headers', async () => {
    const resetTime = Date.now() + 60000;
    mockService.consume.mockResolvedValue({
      allowed: true,
      remaining: 50,
      resetTime,
      total: 100,
    });

    const res = mockResponse();
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ ip: '127.0.0.1', connection: {} }),
        getResponse: () => res,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    await guard.canActivate(ctx);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 50);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', resetTime);
  });
});
