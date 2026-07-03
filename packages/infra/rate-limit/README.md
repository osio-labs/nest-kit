# Rate Limit — `@os.io/nest-kit/infra/rate-limit`

Pluggable rate-limiting module for NestJS with multiple algorithms and storage backends.

## Adapters

| Adapter                         | Algorithm    | Storage   | Distributed | Persistence |
| ------------------------------- | ------------ | --------- | ----------- | ----------- |
| `MemoryRateLimitAdapter`        | Fixed window | In-memory | ❌          | ❌          |
| `SlidingMemoryRateLimitAdapter` | Sliding log  | In-memory | ❌          | ❌          |
| `TokenBucketRateLimitAdapter`   | Token bucket | In-memory | ❌          | ❌          |
| `CacheRateLimitAdapter`         | Fixed window | Any cache | ✅          | ❌          |
| `SlidingCacheRateLimitAdapter`  | Sliding log  | Any cache | ✅          | ❌          |
| `ClusterRateLimitAdapter`       | Fixed window | In-memory | Partial     | ❌          |
| `RedisRateLimitAdapter`         | Fixed window | Redis     | ✅          | ✅          |
| `TypeOrmRateLimitAdapter`       | Fixed window | Database  | ✅          | ✅          |

## Installation

```bash
npm install @os.io/nest-kit
# Optional: for TypeOrmRateLimitAdapter
npm install typeorm @nestjs/typeorm
# Optional: for RedisRateLimitAdapter
npm install ioredis
```

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { RateLimitModule } from '@os.io/nest-kit/infra/rate-limit';
import { MemoryRateLimitAdapter } from '@os.io/nest-kit/infra/rate-limit/adapters';

@Module({
  imports: [
    RateLimitModule.forRoot({
      adapter: new MemoryRateLimitAdapter(),
      defaultLimit: 100,
      defaultWindowSeconds: 60,
    }),
  ],
})
export class AppModule {}
```

## Protecting routes

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimitGuard, RateLimit } from '@os.io/nest-kit/infra/rate-limit';

@Controller('api')
@UseGuards(RateLimitGuard)
export class ApiController {
  @Get('public')
  @RateLimit({ limit: 100, windowSeconds: 60 })
  publicEndpoint() {}

  @Get('heavy')
  @RateLimit({ limit: 10, windowSeconds: 60, errorMessage: 'Heavy endpoint — slow down!' })
  heavyOperation() {}
}
```

## Usage by adapter

:::tabs

== Memory

Simple fixed-window counter using `Map`. Best for development and single-process apps.

```typescript
import { MemoryRateLimitAdapter } from '@os.io/nest-kit/infra/rate-limit/adapters';

const adapter = new MemoryRateLimitAdapter();
// Optional: pass cleanup interval in ms (default 60_000)
const adapter2 = new MemoryRateLimitAdapter(30_000);
```

== Sliding Memory

Precise sliding-window log using timestamp arrays. More accurate than fixed window.

```typescript
import { SlidingMemoryRateLimitAdapter } from '@os.io/nest-kit/infra/rate-limit/adapters';

const adapter = new SlidingMemoryRateLimitAdapter();
```

== Token Bucket

Token bucket algorithm — allows bursts up to the bucket capacity, then refills at a steady rate.

```typescript
import { TokenBucketRateLimitAdapter } from '@os.io/nest-kit/infra/rate-limit/adapters';

const adapter = new TokenBucketRateLimitAdapter();
// limit=10, windowSeconds=60 => 10 tokens per 60s, refills at 1 token per 6s
```

== Cache

Fixed-window counter using any cache backend (Redis, Memcached, etc.). Provides distributed rate limiting.

```typescript
import { CacheRateLimitAdapter } from '@os.io/nest-kit/infra/rate-limit/adapters';
import type { CacheRateLimitAdapterOptions } from '@os.io/nest-kit/infra/rate-limit/adapters';

const cache: CacheRateLimitAdapterOptions = {
  get: async (key) => redis.get(key).then(JSON.parse),
  set: async (key, value, ttl) => redis.setex(key, ttl, JSON.stringify(value)),
  del: async (key) => redis.del(key),
};

const adapter = new CacheRateLimitAdapter(cache);
```

== Sliding Cache

Sliding-window log using a cache backend. Requires sorted-set operations (Redis ZADD, ZREMRANGEBYSCORE).

```typescript
import { SlidingCacheRateLimitAdapter } from '@os.io/nest-kit/infra/rate-limit/adapters';

const adapter = new SlidingCacheRateLimitAdapter({
  addAndCount: async (key, member, score, ttl) => {
    await redis.zadd(key, score, member);
    await redis.expire(key, ttl);
    return redis.zcard(key);
  },
  removeRangeByScore: async (key, min, max) => {
    await redis.zremrangebyscore(key, min, max);
  },
  del: async (key) => redis.del(key),
});
```

== Cluster

Uses per-worker memory for Node.js cluster deployments. Each worker maintains its own counters.

```typescript
import { ClusterRateLimitAdapter } from '@os.io/nest-kit/infra/rate-limit/adapters';

const adapter = new ClusterRateLimitAdapter();
```

== Redis

Fixed-window counter using Redis `INCR` / `EXPIRE`. Works with both [ioredis](https://github.com/redis/ioredis) and [node-redis](https://github.com/redis/node-redis) v4+.

**ioredis:**

```typescript
import Redis from 'ioredis';
import { RedisRateLimitAdapter } from '@os.io/nest-kit/infra/rate-limit/adapters';

const redis = new Redis();
const adapter = new RedisRateLimitAdapter(redis);
```

**node-redis v4:**

```typescript
import { createClient } from 'redis';
import { RedisRateLimitAdapter } from '@os.io/nest-kit/infra/rate-limit/adapters';
import type { RedisRateLimitClient } from '@os.io/nest-kit/infra/rate-limit/adapters';

const redis = createClient();
await redis.connect();

const client: RedisRateLimitClient = {
  incr: (key) => redis.incr(key),
  expire: (key, sec) => redis.expire(key, sec),
  pttl: (key) => redis.pTTL(key),
  del: (key) => redis.del(key),
};

const adapter = new RedisRateLimitAdapter(client);
```

== TypeORM

Persistent rate-limit counters using TypeORM. Stores data in a `rate_limits` table.

```typescript
import { Repository } from 'typeorm';
import { TypeOrmRateLimitAdapter } from '@os.io/nest-kit/infra/rate-limit/adapters';
import { RateLimitEntity } from '@os.io/nest-kit/infra/rate-limit';

const repo = dataSource.getRepository(RateLimitEntity);
const adapter = new TypeOrmRateLimitAdapter(repo);
```

When using `@nestjs/typeorm`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { RateLimitEntity } from '@os.io/nest-kit/infra/rate-limit';
import { TypeOrmRateLimitAdapter } from '@os.io/nest-kit/infra/rate-limit/adapters';
import { RateLimitModule } from '@os.io/nest-kit/infra/rate-limit';

@Module({
  imports: [
    TypeOrmModule.forFeature([RateLimitEntity]),
    RateLimitModule.forRootAsync({
      useFactory: (repo: Repository<RateLimitEntity>) => ({
        adapter: new TypeOrmRateLimitAdapter(repo),
      }),
      inject: [getRepositoryToken(RateLimitEntity)],
    }),
  ],
})
export class MyFeatureModule {}
```

:::

## Custom key generator

```typescript
@RateLimit({
  limit: 50,
  windowSeconds: 60,
  keyGenerator: (ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.id ?? req.ip;
  },
})
```

## Service usage

```typescript
import { RateLimitService } from '@os.io/nest-kit/infra/rate-limit';

@Injectable()
export class MyService {
  constructor(private readonly rateLimit: RateLimitService) {}

  async process(data: any) {
    const result = await this.rateLimit.consume('my-custom-key', 10, 60);
    if (!result.allowed) {
      throw new Error('Rate limited');
    }
    // process...
  }
}
```
