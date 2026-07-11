/**
 * @os.io/nest-kit/infra/activity-feed
 *
 * Activity feeds for NestJS — record user actions, build personalized
 * feeds, and manage follow relationships. Supports in-memory (dev),
 * TypeORM (persistent), and Redis (high-performance) storage backends.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { ActivityFeedModule } from '@os.io/nest-kit/infra/activity-feed';
 * import { MemoryFeedStore } from '@os.io/nest-kit/infra/activity-feed/adapters';
 *
 * @Module({
 *   imports: [
 *     ActivityFeedModule.forRoot({ store: new MemoryFeedStore() }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * Then inject `ActivityFeedService` anywhere:
 * ```typescript
 * constructor(private readonly feed: ActivityFeedService) {}
 *
 * // Record
 * await this.feed.record({ actorId: userId, verb: 'post', objectId: postId, objectType: 'post' });
 *
 * // Query
 * const feed = await this.feed.getFeed(userId, { limit: 20 });
 * ```
 *
 * @module
 * @packageDocumentation
 */

// ──────── Entities ────────
export { ActivityFeedEntity } from './activity-feed.entity.js';
export { ActivityFeedFollowEntity } from './activity-feed-follow.entity.js';

// ──────── Types ────────
export type {
  Activity,
  FeedFilters,
  PaginatedFeed,
  ActivityFeedStore,
  ActivityFeedModuleOptions,
  ActivityFeedModuleAsyncOptions,
} from './activity-feed.types.js';

// ──────── Constants ────────
export { ACTIVITY_FEED_MODULE_OPTIONS, ACTIVITY_FEED_STORE } from './activity-feed.constants.js';

// ──────── Service ────────
export { ActivityFeedService } from './activity-feed.service.js';

// ──────── NestJS Module ────────
export { ActivityFeedModule } from './activity-feed.module.js';

// ──────── Built-in Adapters ────────
export * from './adapters/index.js';
