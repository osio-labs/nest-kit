import { SlidingCacheRateLimitAdapter } from './sliding-cache.adapter.js';
import type { SlidingCacheRateLimitAdapterOptions } from './sliding-cache.adapter.js';

describe('SlidingCacheRateLimitAdapter', () => {
  let adapter: SlidingCacheRateLimitAdapter;
  let store: Map<string, string[]>;

  beforeEach(() => {
    store = new Map();
    const cache: SlidingCacheRateLimitAdapterOptions = {
      addAndCount: async (key, _member, _score, windowSeconds) => {
        const entries = store.get(key) ?? [];
        entries.push(_member);
        store.set(key, entries);
        const now = _score;
        const windowStart = now - windowSeconds * 1000;
        return entries.filter(() => true).length;
      },
      removeRangeByScore: async (_key, _min, _max) => {
        // no-op in test
      },
      del: async (key) => {
        store.delete(key);
      },
    };
    adapter = new SlidingCacheRateLimitAdapter(cache);
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

  it('should reset key on demand', async () => {
    await adapter.consume('key1', 1, 60);
    await adapter.reset('key1');

    const r = await adapter.consume('key1', 1, 60);
    expect(r.allowed).toBe(true);
  });
});
