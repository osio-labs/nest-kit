import { Inject, Injectable } from '@nestjs/common';
import type { ICacheService } from '../interfaces/index.js';
import {
  CACHE_SERVICE,
  TOKEN_BLACKLIST_PREFIX,
  REFRESH_TOKEN_FAMILY_PREFIX,
} from '../auth.constants.js';

/**
 * Redis-backed token blacklist that enables immediate token revocation.
 *
 * Tokens are stored with a TTL matching the token's remaining lifespan
 * so the blacklist does not grow unbounded.
 */
@Injectable()
export class TokenBlacklistService {
  constructor(
    @Inject(CACHE_SERVICE)
    private readonly cache: ICacheService,
  ) {}

  /**
   * Blacklist an access token (by its `jti`) until its natural expiry.
   *
   * @param jti        Token ID (unique per token)
   * @param ttlSeconds Seconds until the token would have expired
   */
  async blacklistAccess(jti: string, ttlSeconds: number): Promise<void> {
    await this.cache.set(`${TOKEN_BLACKLIST_PREFIX}${jti}`, true, ttlSeconds);
  }

  /**
   * Check whether an access token has been blacklisted.
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    const result = await this.cache.get<boolean>(`${TOKEN_BLACKLIST_PREFIX}${jti}`);
    return result === true;
  }

  /**
   * Flag a refresh token family as revoked.
   * When rotation detects a reused old refresh token, the entire
   * family is revoked to prevent token theft.
   */
  async revokeFamily(familyId: string, ttlSeconds: number): Promise<void> {
    await this.cache.set(`${REFRESH_TOKEN_FAMILY_PREFIX}${familyId}`, true, ttlSeconds);
  }

  /**
   * Check whether a refresh token family has been revoked.
   */
  async isFamilyRevoked(familyId: string): Promise<boolean> {
    const result = await this.cache.get<boolean>(`${REFRESH_TOKEN_FAMILY_PREFIX}${familyId}`);
    return result === true;
  }

  /**
   * Remove a specific token from the blacklist (used during cleanup).
   */
  async remove(jti: string): Promise<void> {
    await this.cache.del(`${TOKEN_BLACKLIST_PREFIX}${jti}`);
  }
}
