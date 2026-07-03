# Activity Feed — `@os.io/nest-kit/infra/activity-feed`

Pluggable activity-feed module for NestJS. Record user actions (actor → verb → object), build personalized feeds, and manage follow relationships.

## Adapters

| Adapter          | Package / Docs                | Persistence | Fan-out | Notes                         |
| ---------------- | ----------------------------- | ----------- | ------- | ----------------------------- |
| MemoryFeedStore  | Built-in                      | None        | No      | Dev / testing only            |
| TypeOrmFeedStore | [typeorm](https://typeorm.io) | SQL / RDBMS | No      | Poll-based, paginated queries |
| RedisFeedStore   | [redis](https://redis.io)     | Redis       | Yes     | Fan-out on write, sorted sets |

## Quick Start

```typescript
import { ActivityFeedModule } from '@os.io/nest-kit/infra/activity-feed';
import { MemoryFeedStore } from '@os.io/nest-kit/infra/activity-feed/adapters';

@Module({
  imports: [ActivityFeedModule.forRoot({ store: new MemoryFeedStore() })],
})
export class AppModule {}
```

```typescript
import { ActivityFeedService } from '@os.io/nest-kit/infra/activity-feed';

@Injectable()
export class MyService {
  constructor(private readonly feed: ActivityFeedService) {}

  async onPostCreated(userId: string, postId: string) {
    await this.feed.record({
      actorId: userId,
      verb: 'post',
      objectId: postId,
      objectType: 'post',
    });
  }

  async getMyFeed(userId: string) {
    return this.feed.getFeed(userId, { limit: 20 });
  }
}
```

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

## TypeORM Setup

```typescript
import { ActivityFeedEntity, ActivityFeedFollowEntity } from '@os.io/nest-kit/infra/activity-feed';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityFeedEntity, ActivityFeedFollowEntity])],
})
export class MyModule {}
```

Provide the repositories when configuring the module:

```typescript
ActivityFeedModule.forRootAsync({
  useFactory: (activityRepo, followRepo) => ({
    store: new TypeOrmFeedStore({
      activityRepository: activityRepo,
      followRepository: followRepo,
    }),
  }),
  inject: [getRepositoryToken(ActivityFeedEntity), getRepositoryToken(ActivityFeedFollowEntity)],
});
```

## Redis Setup

```typescript
import { RedisFeedStore } from '@os.io/nest-kit/infra/activity-feed/adapters';

const redis = new Redis({ host: 'localhost', port: 6379 });

ActivityFeedModule.forRoot({
  store: new RedisFeedStore(redis),
});
```
