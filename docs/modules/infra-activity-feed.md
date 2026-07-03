# Infra / Activity Feed

> Activity feeds for NestJS — record user actions, build personalized feeds, and manage follow relationships. Supports in-memory ([Memory](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)), [TypeORM](https://typeorm.io/), and [Redis](https://redis.io/) storage backends.

```
@os.io/nest-kit/infra/activity-feed
```

---

## Installation

```bash
npm install @os.io/nest-kit
```

Optional peer dependencies:

```bash
# TypeORM
npm install typeorm @nestjs/typeorm

# Redis
npm install redis
```

---

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { ActivityFeedModule } from '@os.io/nest-kit/infra/activity-feed';
import { MemoryFeedStore } from '@os.io/nest-kit/infra/activity-feed/adapters';

@Module({
  imports: [ActivityFeedModule.forRoot({ store: new MemoryFeedStore() })],
})
export class AppModule {}
```

Then inject `ActivityFeedService` anywhere:

```typescript
import { Injectable } from '@nestjs/common';
import { ActivityFeedService } from '@os.io/nest-kit/infra/activity-feed';

@Injectable()
export class PostService {
  constructor(private readonly feed: ActivityFeedService) {}

  async onCreate(userId: string, postId: string) {
    await this.feed.record({
      actorId: userId,
      verb: 'post',
      objectId: postId,
      objectType: 'post',
    });
  }

  async getFeed(userId: string) {
    return this.feed.getFeed(userId, { limit: 20 });
  }
}
```

---

## Adapters

### MemoryFeedStore

In-memory store using `Map` — useful for development and testing. Data is lost on restart.

```typescript
import { MemoryFeedStore } from '@os.io/nest-kit/infra/activity-feed/adapters';

const store = new MemoryFeedStore();
```

### TypeOrmFeedStore

Persistent store backed by SQL/relational databases. Uses two entities:

- `ActivityFeedEntity` — stores activity entries (table: `activity_feed_activities`)
- `ActivityFeedFollowEntity` — stores follow relationships (table: `activity_feed_follows`)

```typescript
import { TypeOrmFeedStore } from '@os.io/nest-kit/infra/activity-feed/adapters';
import { ActivityFeedEntity, ActivityFeedFollowEntity } from '@os.io/nest-kit/infra/activity-feed';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityFeedEntity, ActivityFeedFollowEntity])],
})
export class FeedModule {}

// Provide the store:
const store = new TypeOrmFeedStore({
  activityRepository: myActivityRepo,
  followRepository: myFollowRepo,
});
```

### RedisFeedStore

High-performance store using Redis sorted sets. Fan-out on write — when a user creates an activity, it's pushed to all follower feeds.

```typescript
import { Redis } from 'redis';
import { RedisFeedStore } from '@os.io/nest-kit/infra/activity-feed/adapters';

const redis = new Redis({ host: 'localhost', port: 6379 });
const store = new RedisFeedStore(redis);
```

---

## API

### `ActivityFeedService.record(entry)`

Records a new activity. Returns the saved `Activity` with generated `id` and `createdAt`.

| Field        | Type     | Required | Description       |
| ------------ | -------- | -------- | ----------------- |
| `actorId`    | `string` | Yes      | Who performed it  |
| `verb`       | `string` | Yes      | Action verb       |
| `objectId`   | `string` | Yes      | Target object ID  |
| `objectType` | `string` | No       | Object type       |
| `targetId`   | `string` | No       | Secondary target  |
| `targetType` | `string` | No       | Secondary type    |
| `metadata`   | `object` | No       | Arbitrary payload |

### `ActivityFeedService.getFeed(userId, filters?)`

Returns the feed for a user, aggregating activities from followed users.

### `ActivityFeedService.follow(followerId, followingId)`

Creates a follow relationship.

### `ActivityFeedService.unfollow(followerId, followingId)`

Removes a follow relationship.

---

## Adapter Comparison

| Feature          | Memory | TypeORM | Redis |
| ---------------- | ------ | ------- | ----- |
| Persistence      | ❌     | ✅      | ✅    |
| Feed fan-out     | ❌     | ❌      | ✅    |
| Complex queries  | ❌     | ✅      | ❌    |
| Dev / test ready | ✅     | ❌      | ❌    |
| Production       | ❌     | ✅      | ✅    |

---

## Architecture

```
┌──────────────┐     ┌───────────────────┐
│  Controller  │────▶│ ActivityFeedSvc   │
│  / Resolver  │     │ record / getFeed  │
└──────────────┘     │ follow / unfollow │
                     └───────┬───────────┘
                             │
                    ┌────────▼────────┐
                    │ ActivityFeedStore│ ◀── interface
                    │ (adapter)       │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        MemoryFeed     TypeOrmFeed     RedisFeed
        Store          Store           Store
```
