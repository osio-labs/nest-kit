import { RedisRateLimitAdapter } from './redis.adapter';

describe('RedisRateLimitAdapter', () => {
  let adapter: RedisRateLimitAdapter;
  const mockClient = {
    incr: jest.fn(),
    expire: jest.fn(),
    pttl: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new RedisRateLimitAdapter(mockClient as any);
  });

  it('should allow first request and set expiry', async () => {
    mockClient.incr.mockResolvedValue(1);

    const result = await adapter.consume('key-1', 10, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(mockClient.expire).toHaveBeenCalledWith('key-1', 60);
  });

  it('should allow subsequent requests within limit', async () => {
    mockClient.incr.mockResolvedValue(3);
    mockClient.pttl.mockResolvedValue(50000);

    const result = await adapter.consume('key-1', 10, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(7);
  });

  it('should block when over limit', async () => {
    mockClient.incr.mockResolvedValue(11);
    mockClient.pttl.mockResolvedValue(45000);
    const before = Date.now();

    const result = await adapter.consume('key-1', 10, 60);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetTime).toBeGreaterThanOrEqual(before + 45000);
  });

  it('should reset key', async () => {
    await adapter.reset('key-1');

    expect(mockClient.del).toHaveBeenCalledWith('key-1');
  });
});
