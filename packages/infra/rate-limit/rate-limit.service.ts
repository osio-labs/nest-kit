import { Inject, Injectable } from '@nestjs/common';
import { RATE_LIMIT_ADAPTER, RATE_LIMIT_MODULE_OPTIONS } from './rate-limit.constants';
import type { RateLimitAdapter, RateLimitModuleOptions, RateLimitResult } from './rate-limit.types';

@Injectable()
export class RateLimitService {
  constructor(
    @Inject(RATE_LIMIT_ADAPTER)
    private readonly adapter: RateLimitAdapter,
    @Inject(RATE_LIMIT_MODULE_OPTIONS)
    private readonly options: RateLimitModuleOptions,
  ) {}

  async consume(key: string, limit?: number, windowSeconds?: number): Promise<RateLimitResult> {
    return this.adapter.consume(
      key,
      limit ?? this.options.defaultLimit ?? 100,
      windowSeconds ?? this.options.defaultWindowSeconds ?? 60,
    );
  }

  async reset(key: string): Promise<void> {
    return this.adapter.reset(key);
  }
}
