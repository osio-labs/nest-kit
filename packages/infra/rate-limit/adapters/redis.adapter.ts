import type { RateLimitAdapter, RateLimitResult } from '../rate-limit.types.js';

export interface RedisRateLimitClient {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number | boolean>;
  pttl(key: string): Promise<number>;
  del(key: string): Promise<number>;
}

export class RedisRateLimitAdapter implements RateLimitAdapter {
  constructor(private readonly client: RedisRateLimitClient) {}

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const count = await this.client.incr(key);

    if (count === 1) {
      await this.client.expire(key, windowSeconds);
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: Date.now() + windowSeconds * 1000,
        total: limit,
      };
    }

    const ttl = await this.client.pttl(key);
    const resetTime = ttl > 0 ? Date.now() + ttl : Date.now() + windowSeconds * 1000;

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetTime,
      total: limit,
    };
  }

  async reset(key: string): Promise<void> {
    await this.client.del(key);
  }
}
