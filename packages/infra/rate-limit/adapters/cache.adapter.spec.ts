import { CacheRateLimitAdapter } from './cache.adapter';
import type { CacheRateLimitAdapterOptions } from './cache.adapter';

describe('CacheRateLimitAdapter', () => {
  let adapter: CacheRateLimitAdapter;
  let store: Map<string, { count: number; resetTime: number }>;
  let ttlMap: Map<string, number>;

  beforeEach(() => {
    store = new Map();
    ttlMap = new Map();
    const cache: CacheRateLimitAdapterOptions = {
      get: async (key) => store.get(key),
      set: async (key, value, ttl) => {
        store.set(key, value);
        ttlMap.set(key, ttl);
      },
      del: async (key) => {
        store.delete(key);
        ttlMap.delete(key);
      },
    };
    adapter = new CacheRateLimitAdapter(cache);
  });

  it('should allow requests within limit', async () => {
    const r1 = await adapter.consume('key1', 5, 60);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(4);

    const r2 = await adapter.consume('key1', 5, 60);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(3);
  });

  it('should block when limit exceeded', async () => {
    for (let i = 0; i < 3; i++) {
      await adapter.consume('key1', 3, 60);
    }

    const r = await adapter.consume('key1', 3, 60);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it('should reset when window expires', async () => {
    await adapter.consume('key1', 1, 60);
    store.set('key1', { count: 0, resetTime: Date.now() - 1 });

    const r = await adapter.consume('key1', 1, 60);
    expect(r.allowed).toBe(true);
  });

  it('should reset key on demand', async () => {
    await adapter.consume('key1', 1, 60);
    await adapter.reset('key1');

    const r = await adapter.consume('key1', 1, 60);
    expect(r.allowed).toBe(true);
  });

  it('should set TTL on cache entries', async () => {
    await adapter.consume('key1', 5, 60);
    expect(ttlMap.get('key1')).toBe(60);
  });
});
