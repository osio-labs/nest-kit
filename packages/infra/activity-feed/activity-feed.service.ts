import { Inject, Injectable } from '@nestjs/common';
import { ACTIVITY_FEED_STORE } from './activity-feed.constants.js';
import type {
  Activity,
  ActivityFeedStore,
  FeedFilters,
  PaginatedFeed,
} from './activity-feed.types.js';

/**
 * Service for recording and querying activity feeds.
 *
 * Delegates to a configurable {@link ActivityFeedStore} for persistence.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class PostService {
 *   constructor(private readonly feed: ActivityFeedService) {}
 *
 *   async createPost(userId: string, content: string) {
 *     const post = await this.postRepo.save({ userId, content });
 *     await this.feed.record({
 *       actorId: userId,
 *       verb: 'post',
 *       objectId: post.id,
 *       objectType: 'post',
 *     });
 *     return post;
 *   }
 * }
 * ```
 */
@Injectable()
export class ActivityFeedService {
  constructor(
    @Inject(ACTIVITY_FEED_STORE)
    private readonly store: ActivityFeedStore,
  ) {}

  /**
   * Record a new activity and push it to followers' feeds.
   *
   * @returns The persisted activity with `id` and `createdAt`.
   */
  async record(params: {
    actorId: string;
    verb: string;
    objectId: string;
    objectType?: string;
    targetId?: string;
    targetType?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Activity> {
    return this.store.save({
      actorId: params.actorId,
      verb: params.verb,
      objectId: params.objectId,
      objectType: params.objectType,
      targetId: params.targetId,
      targetType: params.targetType,
      metadata: params.metadata,
    });
  }

  /**
   * Get the activity feed for a user (activities from entities they follow).
   *
   * @param userId  The user whose feed to retrieve.
   * @param options  Optional filters.
   */
  async getFeed(
    userId: string,
    options?: {
      verbs?: string[];
      limit?: number;
      offset?: number;
      cursor?: string;
    },
  ): Promise<PaginatedFeed> {
    const following = await this.store.getFollowing(userId);
    if (following.length === 0) {
      return { items: [], hasMore: false };
    }
    return this.store.getFeed({
      userIds: following,
      verbs: options?.verbs,
      limit: options?.limit ?? 20,
      offset: options?.offset,
      cursor: options?.cursor,
    });
  }

  /**
   * Get a raw activity feed filtered by the given criteria.
   * Useful for admin panels or server-side rendering.
   */
  async query(filters: FeedFilters): Promise<PaginatedFeed> {
    return this.store.getFeed(filters);
  }

  /**
   * Follow an entity. Future activities by `followingId` will appear
   * in `followerId`'s feed.
   */
  async follow(followerId: string, followingId: string): Promise<void> {
    return this.store.follow(followerId, followingId);
  }

  /**
   * Unfollow an entity.
   */
  async unfollow(followerId: string, followingId: string): Promise<void> {
    return this.store.unfollow(followerId, followingId);
  }

  /**
   * Get all followers of a given entity.
   */
  async getFollowers(userId: string): Promise<string[]> {
    return this.store.getFollowers(userId);
  }

  /**
   * Get all entities a user follows.
   */
  async getFollowing(userId: string): Promise<string[]> {
    return this.store.getFollowing(userId);
  }
}
