import type { RateLimitAdapter, RateLimitResult } from '../rate-limit.types';

export interface SlidingCacheRateLimitAdapterOptions {
  /** Add a timestamp to a sorted set, return current count */
  addAndCount: (
    key: string,
    member: string,
    score: number,
    windowSeconds: number,
  ) => Promise<number>;
  /** Remove members outside the window */
  removeRangeByScore: (key: string, min: number, max: number) => Promise<void>;
  /** Delete the key */
  del: (key: string) => Promise<void>;
}

export class SlidingCacheRateLimitAdapter implements RateLimitAdapter {
  constructor(private readonly cache: SlidingCacheRateLimitAdapterOptions) {}

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;
    const windowStart = now - windowSeconds * 1000;

    await this.cache.removeRangeByScore(key, 0, windowStart);
    const count = await this.cache.addAndCount(key, member, now, windowSeconds);

    const allowed = count <= limit;

    return {
      allowed,
      remaining: Math.max(0, limit - count),
      resetTime: windowStart + windowSeconds * 1000 + windowSeconds * 1000,
      total: limit,
    };
  }

  async reset(key: string): Promise<void> {
    await this.cache.del(key);
  }
}
