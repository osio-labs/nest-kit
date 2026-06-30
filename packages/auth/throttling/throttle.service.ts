import { Inject, Injectable } from '@nestjs/common';
import type { ICacheService } from '../interfaces';
import { CACHE_SERVICE, LOGIN_ATTEMPT_PREFIX } from '../auth.constants';

/**
 * Rate-limits login attempts per identifier (email, IP, etc.)
 * using the shared cache.
 */
@Injectable()
export class ThrottleService {
  constructor(
    @Inject(CACHE_SERVICE)
    private readonly cache: ICacheService,
  ) {}

  /**
   * Check if the identifier is currently throttled.
   *
   * @param identifier  User email, IP, or any unique key
   * @param maxAttempts Max allowed attempts (default 5)
   * @param windowSec   Window in seconds (default 900 = 15 min)
   * @throws Error if throttled
   */
  async check(identifier: string, maxAttempts = 5, windowSec = 900): Promise<void> {
    const key = `${LOGIN_ATTEMPT_PREFIX}${identifier}`;
    const attempts = await this.cache.get<number>(key);
    const current = attempts ?? 0;

    if (current >= maxAttempts) {
      throw new Error(`Too many login attempts. Please try again in ${windowSec} seconds.`);
    }
  }

  /**
   * Record a failed login attempt.
   */
  async recordFailure(identifier: string, windowSec = 900): Promise<void> {
    const key = `${LOGIN_ATTEMPT_PREFIX}${identifier}`;
    const attempts = await this.cache.get<number>(key);
    const next = (attempts ?? 0) + 1;

    // Extend TTL on each failure so the window resets only after inactivity
    await this.cache.set(key, next, windowSec);
  }

  /**
   * Clear the attempt counter on successful login.
   */
  async clear(identifier: string): Promise<void> {
    await this.cache.del(`${LOGIN_ATTEMPT_PREFIX}${identifier}`);
  }
}
