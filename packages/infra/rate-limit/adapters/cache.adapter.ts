import type { RateLimitAdapter, RateLimitResult } from '../rate-limit.types';

export interface CacheRateLimitAdapterOptions {
  get: (key: string) => Promise<{ count: number; resetTime: number } | undefined>;
  set: (key: string, value: { count: number; resetTime: number }, ttl: number) => Promise<void>;
  del: (key: string) => Promise<void>;
}

export class CacheRateLimitAdapter implements RateLimitAdapter {
  constructor(private readonly cache: CacheRateLimitAdapterOptions) {}

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = await this.cache.get(key);

    if (!entry || now >= entry.resetTime) {
      const resetTime = now + windowSeconds * 1000;
      await this.cache.set(key, { count: 1, resetTime }, windowSeconds);
      return { allowed: true, remaining: limit - 1, resetTime, total: limit };
    }

    entry.count += 1;
    await this.cache.set(key, entry, Math.ceil((entry.resetTime - now) / 1000));

    return {
      allowed: entry.count <= limit,
      remaining: Math.max(0, limit - entry.count),
      resetTime: entry.resetTime,
      total: limit,
    };
  }

  async reset(key: string): Promise<void> {
    await this.cache.del(key);
  }
}
