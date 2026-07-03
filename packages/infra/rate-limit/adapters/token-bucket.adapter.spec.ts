import { TokenBucketRateLimitAdapter } from './token-bucket.adapter';

describe('TokenBucketRateLimitAdapter', () => {
  let adapter: TokenBucketRateLimitAdapter;

  beforeEach(() => {
    adapter = new TokenBucketRateLimitAdapter(10_000);
  });

  afterEach(() => {
    adapter.destroy();
  });

  it('should allow requests within limit', async () => {
    const r1 = await adapter.consume('key1', 10, 60);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(9);
  });

  it('should refill tokens over time', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    for (let i = 0; i < 10; i++) {
      await adapter.consume('key1', 10, 60);
    }

    let r = await adapter.consume('key1', 10, 60);
    expect(r.allowed).toBe(false);

    jest.spyOn(Date, 'now').mockReturnValue(now + 6_000);
    r = await adapter.consume('key1', 10, 60);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBeGreaterThanOrEqual(0);
  });

  it('should handle burst then throttle', async () => {
    for (let i = 0; i < 5; i++) {
      await adapter.consume('key1', 5, 60);
    }

    const r = await adapter.consume('key1', 5, 60);
    expect(r.allowed).toBe(false);
  });

  it('should reset key on demand', async () => {
    await adapter.consume('key1', 1, 60);
    await adapter.reset('key1');

    const r = await adapter.consume('key1', 1, 60);
    expect(r.allowed).toBe(true);
  });
});
