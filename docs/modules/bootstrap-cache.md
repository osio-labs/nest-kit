# Bootstrap / Cache

> Cache module configuration bootstrapper for NestJS.

Supports **memory** (via `cacheable`), **Redis** (`@keyv/redis`), **Valkey** (`@keyv/valkey`), and **multi‑store** with optional **RDS (ElastiCache) TLS**.

## Install

```bash
npm install @nestjs/cache-manager cache-manager keyv
# Optional store adapters:
npm install cacheable               # memory (KeyvCacheableMemory)
npm install @keyv/redis             # Redis
npm install @keyv/valkey            # Valkey
```

## Quick Start

```ts
import { CacheModule } from '@nestjs/cache-manager';
import { configCache } from '@os.io/nest-kit/bootstrap';

@Module({
  imports: [CacheModule.register(configCache())],
})
export class AppModule {}
```

Default: in‑memory cache, `ttl: 60s`, `max: 100`.

## API

### `configCache(options?)`

Build cache module options from environment variables (`process.env`).

```ts
const cfg = configCache();
CacheModule.register(cfg);
```

### `configCache(options?, configService?)`

Build cache module options from environment variables or NestJS `ConfigService`.

```ts
// Sync
CacheModule.register(configCache({ keyv: Keyv, stores: [...] }));

// Async with ConfigService
CacheModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (cs) => configCache({ keyv: Keyv, stores: [...] }, cs),
});
```

### Options

#### `CacheConfigOptions`

| Option     | Type                 | Default | Description                          |
| ---------- | -------------------- | ------- | ------------------------------------ |
| `ttl`      | `number`             | `60`    | Default TTL (seconds)                |
| `isGlobal` | `boolean`            | `false` | Register as `@Global()`              |
| `stores`   | `CacheStoreConfig[]` | —       | One or more store configs            |
| `keyv`     | `Keyv` constructor   | —       | When provided, builds Keyv instances |

#### `CacheStoreConfig`

| Option       | Type                              | Default                    | Description                                              |
| ------------ | --------------------------------- | -------------------------- | -------------------------------------------------------- |
| `type`       | `'memory' \| 'redis' \| 'valkey'` | —                          | Store type                                               |
| `name`       | `string`                          | —                          | Distinguish instances; enables `CACHE_{NAME}_*` env vars |
| `adapter`    | constructor                       | —                          | Keyv adapter class (e.g. `KeyvRedis`)                    |
| `max`        | `number`                          | `100`                      | Max items (memory, passed as `lruSize`)                  |
| `url`        | `string`                          | `redis://localhost:6379/0` | Connection URL                                           |
| `keyPrefix`  | `string`                          | —                          | Key prefix for namespacing                               |
| `rdsEnabled` | `boolean`                         | `false`                    | Enable TLS for ElastiCache                               |
| `ttl`        | `number`                          | `60`                       | Store-level TTL override                                 |

### Examples

#### Memory (no extra deps)

```ts
CacheModule.register(configCache());
```

#### Redis with Keyv

```ts
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

const cfg = configCache({
  keyv: Keyv,
  stores: [{ type: 'redis', adapter: KeyvRedis, url: 'redis://localhost:6379' }],
});
CacheModule.register(cfg);
```

#### Multi-store (memory + Redis)

```ts
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { KeyvCacheableMemory } from 'cacheable';

const cfg = configCache({
  keyv: Keyv,
  stores: [
    { type: 'memory', adapter: KeyvCacheableMemory, max: 200 },
    { type: 'redis', adapter: KeyvRedis },
  ],
});
```

#### Named stores with env overrides

```ts
configCache({
  stores: [
    { type: 'redis', name: 'sessions', adapter: KeyvRedis },
    { type: 'redis', name: 'data', adapter: KeyvRedis },
  ],
});
// Reads: CACHE_SESSIONS_URL, CACHE_DATA_URL
```

#### RDS / ElastiCache TLS

```ts
configCache({
  stores: [{ type: 'redis', adapter: KeyvRedis, rdsEnabled: true }],
});
// Or via env: RDS_CACHE_ENABLED=true
```

### Environment Variables

| Variable                  | Default                    | Description                   |
| ------------------------- | -------------------------- | ----------------------------- |
| `CACHE_STORE`             | `memory`                   | Comma-separated store types   |
| `CACHE_TTL`               | `60`                       | Default TTL (seconds)         |
| `CACHE_MAX`               | `100`                      | Max items (memory)            |
| `CACHE_IS_GLOBAL`         | `false`                    | Register as global module     |
| `CACHE_{NAME}_URL`        | —                          | Named-store URL override      |
| `CACHE_{NAME}_KEY_PREFIX` | —                          | Named-store key prefix        |
| `CACHE_{NAME}_TTL`        | —                          | Named-store TTL override      |
| `CACHE_{NAME}_MAX`        | —                          | Named-store max override      |
| `REDIS_URL`               | `redis://localhost:6379/0` | Redis connection URL          |
| `REDIS_KEY_PREFIX`        | —                          | Redis key prefix              |
| `VALKEY_URL`              | `redis://localhost:6379/0` | Valkey connection URL         |
| `VALKEY_KEY_PREFIX`       | —                          | Valkey key prefix             |
| `RDS_CACHE_ENABLED`       | `false`                    | Enable TLS for Redis / Valkey |
