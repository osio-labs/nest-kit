/* eslint-disable @typescript-eslint/require-await */
import type { RateLimitAdapter, RateLimitResult } from '../rate-limit.types';

interface BucketState {
  tokens: number;
  lastRefill: number;
}

export class TokenBucketRateLimitAdapter implements RateLimitAdapter {
  private store = new Map<string, BucketState>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(cleanupMs = 60_000) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupMs);
    this.cleanupInterval.unref();
  }

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const refillRate = limit / (windowSeconds * 1000);

    let bucket = this.store.get(key);
    if (!bucket) {
      bucket = { tokens: limit - 1, lastRefill: now };
      this.store.set(key, bucket);
      return {
        allowed: true,
        remaining: Math.max(0, limit - 1),
        resetTime: now + windowSeconds * 1000,
        total: limit,
      };
    }

    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(limit, bucket.tokens + elapsed * refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      this.store.set(key, bucket);
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetTime: now + windowSeconds * 1000,
        total: limit,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: now + windowSeconds * 1000,
      total: limit,
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key] of this.store) {
      const bucket = this.store.get(key)!;
      if (now - bucket.lastRefill > 300_000 && bucket.tokens >= 0) {
        this.store.delete(key);
      }
    }
  }
}
