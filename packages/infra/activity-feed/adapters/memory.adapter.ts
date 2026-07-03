/* eslint-disable @typescript-eslint/require-await */

import type {
  Activity,
  ActivityFeedStore,
  FeedFilters,
  PaginatedFeed,
} from '../activity-feed.types';

/**
 * In-memory activity feed store.
 *
 * All data is held in memory. Useful for local development and testing.
 * Not suitable for production multi-process deployments.
 */
export class MemoryFeedStore implements ActivityFeedStore {
  private activities: Activity[] = [];
  private follows: Map<string, Set<string>> = new Map(); // follower -> following
  private reverseFollows: Map<string, Set<string>> = new Map(); // following -> followers

  async save(entry: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> {
    const activity: Activity = {
      id: crypto.randomUUID(),
      ...entry,
      createdAt: new Date(),
    };
    this.activities.unshift(activity);
    return activity;
  }

  async getFeed(filters: FeedFilters): Promise<PaginatedFeed> {
    let items = this.activities;

    if (filters.userIds?.length) {
      const actorSet = new Set(filters.userIds);
      items = items.filter((a) => actorSet.has(a.actorId));
    }
    if (filters.verbs?.length) {
      const verbSet = new Set(filters.verbs);
      items = items.filter((a) => verbSet.has(a.verb));
    }
    if (filters.from) {
      items = items.filter((a) => a.createdAt >= filters.from!);
    }
    if (filters.to) {
      items = items.filter((a) => a.createdAt <= filters.to!);
    }

    const total = items.length;
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 20;
    const page = items.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return { items: page, total, hasMore };
  }

  async follow(followerId: string, followingId: string): Promise<void> {
    if (!this.follows.has(followerId)) {
      this.follows.set(followerId, new Set());
    }
    this.follows.get(followerId)!.add(followingId);

    if (!this.reverseFollows.has(followingId)) {
      this.reverseFollows.set(followingId, new Set());
    }
    this.reverseFollows.get(followingId)!.add(followerId);
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    this.follows.get(followerId)?.delete(followingId);
    this.reverseFollows.get(followingId)?.delete(followerId);
  }

  async getFollowers(userId: string): Promise<string[]> {
    return Array.from(this.reverseFollows.get(userId) ?? []);
  }

  async getFollowing(userId: string): Promise<string[]> {
    return Array.from(this.follows.get(userId) ?? []);
  }
}
