/**
 * Built-in adapters for the activity-feed module.
 *
 * Each adapter implements {@link ActivityFeedStore} and can be passed
 * to `ActivityFeedModule.forRoot({ store: … })`.
 *
 * @module
 * @packageDocumentation
 */

export { MemoryFeedStore } from './memory.adapter';

export { TypeOrmFeedStore } from './typeorm.adapter';

export { RedisFeedStore } from './redis.adapter';
export type { RedisFeedStoreOptions } from './redis.adapter';
