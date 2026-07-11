/**
 * Built-in adapters for the activity-feed module.
 *
 * Each adapter implements {@link ActivityFeedStore} and can be passed
 * to `ActivityFeedModule.forRoot({ store: … })`.
 *
 * @module
 * @packageDocumentation
 */

export { MemoryFeedStore } from './memory.adapter.js';

export { TypeOrmFeedStore } from './typeorm.adapter.js';

export { RedisFeedStore } from './redis.adapter.js';
export type { RedisFeedStoreOptions } from './redis.adapter.js';
