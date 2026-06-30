# @os.io/nest-kit — Cache Bootstrapper

Build `CacheModule.register()` / `registerAsync()` options from environment variables or `ConfigService`.

Supports **memory** (via `cacheable`), **Redis** (`@keyv/redis`), **Valkey** (`@keyv/valkey`), and **multi‑store** with optional **RDS (ElastiCache) TLS**.

---

- [Install](#install)
- [Quick Start](#quick-start)
- [Single Store](#single-store)
  - [Memory](#memory)
  - [Redis / Valkey](#redis--valkey)
- [Multi‑Store](#multi-store)
- [Named Stores](#named-stores)
- [RDS / ElastiCache Mode](#rds--elasticache-mode)
- [Environment Variables](#environment-variables)
- [API](#api)

---

## Install

```bash
npm install @nestjs/cache-manager cache-manager keyv
# Optional — store adapters:
npm install cacheable               # memory (KeyvCacheableMemory)
npm install @keyv/redis             # Redis
npm install @keyv/valkey            # Valkey
```

The bootstrapper accepts adapter classes so your app does not need to import `keyv` or any adapter unless it actually uses them.

## Quick Start

```ts
import { CacheModule } from '@nestjs/cache-manager';
import { configCache } from '@os.io/nest-kit/bootstrap/cache';

@Module({
  imports: [CacheModule.register(configCache())],
})
export class AppModule {}
```

Default: in‑memory cache, `ttl: 60s`, `max: 100`.

## .env Example

Copy this into your `.env` file and adjust as needed:

```bash
# ----- Cache (default: memory) -----
CACHE_STORE=memory
CACHE_TTL=60
CACHE_MAX=100

# ----- Redis -----
# CACHE_STORE=redis
# REDIS_URL=redis://localhost:6379/0
# REDIS_KEY_PREFIX=myapp:

# ----- Valkey -----
# CACHE_STORE=valkey
# VALKEY_URL=redis://localhost:6379/0

# ----- Multi-store (memory + Redis) -----
# CACHE_STORE=memory,redis

# ----- Named stores (e.g. two Redis instances) -----
# CACHE_STORE=redis,redis
# CACHE_SESSIONS_URL=redis://localhost:6379/1
# CACHE_SESSIONS_KEY_PREFIX=sessions:
# CACHE_DATA_URL=redis://localhost:6379/2

# ----- TLS (ElastiCache) -----
# RDS_CACHE_ENABLED=true

# ----- Global module -----
# CACHE_IS_GLOBAL=true
```

The connection URL format is `redis://[password@]host:port[/db]` — standard Redis connection string.

## Single Store

### Memory

```ts
// Default — no extra deps required
CacheModule.register(configCache());

// Or via env:
// CACHE_STORE=memory
// CACHE_TTL=120
// CACHE_MAX=500
```

### Redis / Valkey

Pass the `url` directly in code or via `REDIS_URL` / `VALKEY_URL` env vars.

```ts
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

const opts = configCache({
  keyv: Keyv,
  stores: [{ type: 'redis', adapter: KeyvRedis, url: 'redis://localhost:6379/0' }],
});

CacheModule.register(opts);
// opts.store — a single Keyv instance
```

Or rely on environment variables (`CACHE_STORE=redis`, `REDIS_URL=redis://...`):

```ts
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

const opts = configCache({
  keyv: Keyv,
  stores: [{ type: 'redis', adapter: KeyvRedis }],
});
```

Available env vars: `REDIS_URL` (connection string, e.g. `redis://localhost:6379/0`) and `REDIS_KEY_PREFIX`.  
Valkey uses the same set with `VALKEY_*` prefix.

When `keyv` is **not** provided, the function returns raw config data (strings, numbers) — useful if you want to build Keyv instances yourself or use a different caching library.

## Multi‑Store

Combine memory + Redis (or multiple Redis instances) for tiered caching.

```ts
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { KeyvCacheableMemory } from 'cacheable';

const opts = configCache({
  keyv: Keyv,
  stores: [
    { type: 'memory', adapter: KeyvCacheableMemory, max: 100 },
    { type: 'redis', adapter: KeyvRedis },
  ],
});

// opts.store — Keyv with multi-store (Keyv handles tiered reads/writes)
CacheModule.register(opts);
```

Via env: `CACHE_STORE=memory,redis`

When `keyv` is provided, the result contains a single `Keyv` instance (or `Keyv` with multi-store). Without `keyv`, multiple stores produce a `stores` array instead of flattening store keys into the root object.

## Named Stores

When using multiple cache instances of the same type (e.g. two Redis stores), use the `name` property to distinguish them. The `name` is included in the output and also enables `CACHE_{NAME}_*` environment variables that take priority over generic `REDIS_*` / `CACHE_*` vars.

```ts
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

const opts = configCache({
  keyv: Keyv,
  stores: [
    { type: 'redis', name: 'sessions', adapter: KeyvRedis, url: 'redis://localhost:6379/1' },
    { type: 'redis', name: 'data', adapter: KeyvRedis, url: 'redis://localhost:6379/2' },
  ],
});

// opts.store — single Keyv with multi-store
// opts.name → undefined (multiple stores, not flattened)
// opts.stores[0].name → 'sessions'
// opts.stores[1].name → 'data'
```

Or via environment variables:

```
CACHE_STORE=redis,redis
# Named envs for the "sessions" store:
CACHE_SESSIONS_URL=redis://localhost:6379/1
CACHE_SESSIONS_KEY_PREFIX=session:
# Named envs for the "data" store:
CACHE_DATA_URL=redis://localhost:6379/2
```

Without `keyv`, a single named store outputs `{ ..., name }`; multiple stores produce a `stores` array where each entry carries its `name`.

## RDS / ElastiCache Mode

Enable TLS (SSL) for Redis / Valkey connections to AWS ElastiCache.

```ts
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

const opts = configCache({
  keyv: Keyv,
  stores: [{ type: 'redis', adapter: KeyvRedis, rdsEnabled: true }],
});
```

Or via env: `RDS_CACHE_ENABLED=true`

Adds `{ socket: { tls: true } }` to the adapter options.

## Environment Variables

| Variable                  | Default                    | Description                             |
| ------------------------- | -------------------------- | --------------------------------------- |
| `CACHE_STORE`             | `memory`                   | Comma-separated store types             |
| `CACHE_TTL`               | `60`                       | Default TTL (seconds)                   |
| `CACHE_MAX`               | `100`                      | Max items (memory store)                |
| `CACHE_IS_GLOBAL`         | `false`                    | Register as global module               |
| `CACHE_{NAME}_URL`        | —                          | Named-store URL (overrides `REDIS_URL`) |
| `CACHE_{NAME}_KEY_PREFIX` | —                          | Named-store key prefix                  |
| `CACHE_{NAME}_TTL`        | —                          | Named-store TTL (overrides `CACHE_TTL`) |
| `CACHE_{NAME}_MAX`        | —                          | Named-store max (overrides `CACHE_MAX`) |
| `REDIS_URL`               | `redis://localhost:6379/0` | Redis connection URL                    |
| `REDIS_KEY_PREFIX`        | —                          | Redis key prefix                        |
| `VALKEY_URL`              | `redis://localhost:6379/0` | Valkey connection URL                   |
| `VALKEY_KEY_PREFIX`       | —                          | Valkey key prefix                       |
| `RDS_CACHE_ENABLED`       | `false`                    | Enable TLS for Redis / Valkey           |

## API

```ts
configCache(options?: CacheConfigOptions): Record<string, unknown>
configCacheAsync(configService: ConfigService, options?: CacheConfigOptions): Record<string, unknown>
```

### `configCache(options?)`

Build cache module options from environment variables (`process.env`).

```ts
const cfg = configCache({ ttl: 120 });
CacheModule.register(cfg);
```

### `configCacheAsync(configService, options?)`

Build cache module options from NestJS `ConfigService`.

```ts
CacheModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (cs) => configCacheAsync(cs, { keyv: Keyv, stores: [...] }),
});
```

### `CacheConfigOptions`

| Option     | Type                 | Default | Description                            |
| ---------- | -------------------- | ------- | -------------------------------------- |
| `ttl`      | `number`             | `60`    | Default TTL (seconds)                  |
| `isGlobal` | `boolean`            | `false` | Register as global module              |
| `stores`   | `CacheStoreConfig[]` | —       | One or more store configurations       |
| `keyv`     | `Keyv` constructor   | —       | When provided, builds `Keyv` instances |

### `CacheStoreConfig`

| Option       | Type                              | Default                    | Description                             |
| ------------ | --------------------------------- | -------------------------- | --------------------------------------- |
| `type`       | `'memory' \| 'redis' \| 'valkey'` | —                          | Store type                              |
| `name`       | `string`                          | —                          | Optional name to distinguish instances  |
| `adapter`    | `new (...args) => unknown`        | —                          | Keyv adapter class (e.g. `KeyvRedis`)   |
| `max`        | `number`                          | `100`                      | Max items (memory, passed as `lruSize`) |
| `url`        | `string`                          | `redis://localhost:6379/0` | Connection URL (redis / valkey)         |
| `keyPrefix`  | `string`                          | —                          | Key prefix                              |
| `rdsEnabled` | `boolean`                         | `false`                    | Enable TLS for ElastiCache              |
| `ttl`        | `number`                          | `60`                       | Store-level TTL override                |

### Return value

- **With `keyv`**: object with a single `store` (Keyv instance) or `stores` (Keyv multi-store). Each store entry includes `name` if set.
- **Without `keyv`**: flat raw config (`{ store?, ttl, isGlobal, url, keyPrefix, name?, ... }`) with `stores` array when multiple stores.
