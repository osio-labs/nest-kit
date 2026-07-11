import { MemoryRateLimitAdapter } from './memory.adapter.js';

describe('MemoryRateLimitAdapter', () => {
  let adapter: MemoryRateLimitAdapter;

  beforeEach(() => {
    adapter = new MemoryRateLimitAdapter(10_000);
  });

  afterEach(() => {
    adapter.destroy();
  });

  it('should allow requests within limit', async () => {
    const r1 = await adapter.consume('key1', 5, 60);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(4);
    expect(r1.total).toBe(5);

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

  it('should reset after window expires', async () => {
    await adapter.consume('key1', 1, 60);
    // simulate expired window
    (adapter as any).store.set('key1', { count: 0, resetTime: Date.now() - 1 });

    const r = await adapter.consume('key1', 1, 60);
    expect(r.allowed).toBe(true);
  });

  it('should reset key on demand', async () => {
    await adapter.consume('key1', 1, 60);
    await adapter.reset('key1');

    const r = await adapter.consume('key1', 1, 60);
    expect(r.allowed).toBe(true);
  });

  it('should handle different keys independently', async () => {
    await adapter.consume('key-a', 1, 60);
    const r = await adapter.consume('key-b', 1, 60);
    expect(r.allowed).toBe(true);
  });
});
