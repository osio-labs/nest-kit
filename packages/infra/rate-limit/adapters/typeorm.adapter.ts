import type { Repository } from 'typeorm';
import { RateLimitEntity } from '../rate-limit.entity';
import type { RateLimitAdapter, RateLimitResult } from '../rate-limit.types';

export class TypeOrmRateLimitAdapter implements RateLimitAdapter {
  constructor(private readonly repo: Repository<RateLimitEntity>) {}

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const row = await this.repo.findOneBy({ key });

    if (!row || now >= Number(row.expiresAt)) {
      const resetTime = now + windowSeconds * 1000;
      await this.repo.upsert(
        {
          key,
          count: 1,
          expiresAt: resetTime,
          windowSeconds,
        },
        ['key'],
      );
      return { allowed: true, remaining: limit - 1, resetTime, total: limit };
    }

    row.count += 1;
    await this.repo.save(row);

    return {
      allowed: row.count <= limit,
      remaining: Math.max(0, limit - row.count),
      resetTime: Number(row.expiresAt),
      total: limit,
    };
  }

  async reset(key: string): Promise<void> {
    await this.repo.delete({ key });
  }
}
