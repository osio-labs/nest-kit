/* eslint-disable @typescript-eslint/require-await */
import type { RateLimitAdapter, RateLimitResult } from '../rate-limit.types';

export class SlidingMemoryRateLimitAdapter implements RateLimitAdapter {
  private store = new Map<string, number[]>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(cleanupMs = 60_000) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupMs);
    this.cleanupInterval.unref();
  }

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    let timestamps = this.store.get(key);
    if (!timestamps) {
      timestamps = [];
      this.store.set(key, timestamps);
    }

    const valid = timestamps.filter((t) => t > windowStart);
    valid.push(now);
    this.store.set(key, valid);

    const allowed = valid.length <= limit;

    return {
      allowed,
      remaining: Math.max(0, limit - valid.length),
      resetTime: valid.length > 0 ? valid[0] + windowMs : now + windowMs,
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
    for (const [key, timestamps] of this.store) {
      const valid = timestamps.filter((t) => t > now - 120_000);
      if (valid.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, valid);
      }
    }
  }
}
