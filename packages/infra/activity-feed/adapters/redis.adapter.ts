/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

import type {
  Activity,
  ActivityFeedStore,
  FeedFilters,
  PaginatedFeed,
} from '../activity-feed.types.js';

export interface RedisFeedStoreOptions {
  client?: any;
  url?: string;
  /** Key prefix (default `'feed:'`). */
  prefix?: string;
  /** TTL for feed entries in seconds (default 7 days). */
  ttl?: number;
}

/**
 * Redis-backed activity feed store using sorted sets.
 *
 * Stores activities as sorted set members (score = timestamp) for
 * efficient time-range queries and pagination.
 *
 * Follow relationships are stored in Redis sets.
 *
 * Requires `ioredis` as a peer dependency.
 */
export class RedisFeedStore implements ActivityFeedStore {
  private redis: any;
  private prefix: string;
  private ttl: number;

  constructor(options: RedisFeedStoreOptions = {}) {
    this.prefix = options.prefix ?? 'feed:';
    this.ttl = options.ttl ?? 604800; // 7 days
    this.redis = options.client ?? this.createClient(options);
  }

  private createClient(options: RedisFeedStoreOptions): any {
    try {
      const Redis = require('ioredis');
      return options.url ? new Redis(options.url) : new Redis();
    } catch {
      throw new Error(
        'Cannot find module "ioredis".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install ioredis\n',
      );
    }
  }

  private activityKey(verb: string): string {
    return `${this.prefix}activities:${verb}`;
  }

  private userFeedKey(userId: string): string {
    return `${this.prefix}user:${userId}`;
  }

  private followersKey(userId: string): string {
    return `${this.prefix}followers:${userId}`;
  }

  private followingKey(userId: string): string {
    return `${this.prefix}following:${userId}`;
  }

  private nextId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async save(entry: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> {
    const id = this.nextId();
    const now = Date.now();
    const activity: Activity = {
      id,
      ...entry,
      createdAt: new Date(now),
    };

    const json = JSON.stringify(activity);
    const score = now;

    // Store in verb-specific set
    await this.redis.zadd(this.activityKey(entry.verb), score, id);
    await this.redis.set(`${this.prefix}data:${id}`, json, 'EX', this.ttl);

    // Fan-out to followers
    const followers = await this.getFollowers(entry.actorId);
    if (followers.length > 0) {
      const pipeline = this.redis.pipeline();
      for (const followerId of followers) {
        pipeline.zadd(this.userFeedKey(followerId), score, id);
        pipeline.expire(this.userFeedKey(followerId), this.ttl);
      }
      await pipeline.exec();
    }

    return activity;
  }

  async getFeed(filters: FeedFilters): Promise<PaginatedFeed> {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    let ids: string[];

    if (filters.userIds?.length) {
      // Get feed for specific users (merge their activities)
      const keys = filters.userIds.map((u) => this.userFeedKey(u));
      if (keys.length === 1) {
        ids = await this.redis.zrevrange(keys[0], offset, offset + limit - 1);
      } else {
        ids = await this.redis.zrevrange(
          await this.redis.zunionstore(
            `${this.prefix}tmp:${Date.now()}`,
            keys.length,
            ...keys,
            'WEIGHTS',
            ...Array(keys.length).fill(1),
          ),
          offset,
          offset + limit - 1,
        );
      }
    } else if (filters.verbs?.length) {
      const keys = filters.verbs.map((v) => this.activityKey(v));
      if (keys.length === 1) {
        ids = await this.redis.zrevrange(keys[0], offset, offset + limit - 1);
      } else {
        ids = await this.redis.zrevrange(
          await this.redis.zunionstore(
            `${this.prefix}tmp:${Date.now()}`,
            keys.length,
            ...keys,
            'WEIGHTS',
            ...Array(keys.length).fill(1),
          ),
          offset,
          offset + limit - 1,
        );
      }
    } else {
      return { items: [], hasMore: false };
    }

    if (ids.length === 0) {
      return { items: [], hasMore: false };
    }

    // Fetch activity data
    const data = await this.redis.mget(ids.map((id) => `${this.prefix}data:${id}`));
    const items: Activity[] = data
      .filter((d: string | null): d is string => d !== null)
      .map((d: string) => {
        const parsed = JSON.parse(d);
        parsed.createdAt = new Date(parsed.createdAt);
        return parsed as Activity;
      })
      .sort((a: Activity, b: Activity) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      items,
      hasMore: items.length >= limit,
    };
  }

  async follow(followerId: string, followingId: string): Promise<void> {
    await this.redis.sadd(this.followingKey(followerId), followingId);
    await this.redis.sadd(this.followersKey(followingId), followerId);
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.redis.srem(this.followingKey(followerId), followingId);
    await this.redis.srem(this.followersKey(followingId), followerId);
  }

  async getFollowers(userId: string): Promise<string[]> {
    const res = await this.redis.smembers(this.followersKey(userId));
    return res as string[];
  }

  async getFollowing(userId: string): Promise<string[]> {
    const res = await this.redis.smembers(this.followingKey(userId));
    return res as string[];
  }

  async destroy(): Promise<void> {
    if (this.redis && typeof this.redis.quit === 'function') {
      await this.redis.quit();
    }
  }
}
