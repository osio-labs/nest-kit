/* eslint-disable @typescript-eslint/require-await */
import type { RateLimitAdapter, RateLimitResult } from '../rate-limit.types.js';

interface WindowState {
  count: number;
  resetTime: number;
}

export class MemoryRateLimitAdapter implements RateLimitAdapter {
  private store = new Map<string, WindowState>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(cleanupMs = 60_000) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupMs);
    this.cleanupInterval.unref();
  }

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetTime: now + windowMs, total: limit };
    }

    entry.count += 1;
    const allowed = entry.count <= limit;

    return {
      allowed,
      remaining: Math.max(0, limit - entry.count),
      resetTime: entry.resetTime,
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
    for (const [key, entry] of this.store) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}
