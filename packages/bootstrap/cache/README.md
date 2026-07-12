# @os.io/nest-kit — Cache Bootstrapper

Build `CacheModule.register()` / `registerAsync()` options from environment variables or `ConfigService`.

Supports **memory** (via `cacheable`), **Redis** (`@keyv/redis`), **Valkey** (`@keyv/valkey`), and **multi-store** with optional **RDS (ElastiCache) TLS**.

Store types and adapters are auto-detected from environment variables — no need to import adapters.

---

- [Install](#install)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Multi-Store](#multi-store)
- [RDS / ElastiCache Mode](#rds--elasticache-mode)
- [Environment Variables](#environment-variables)
- [API](#api)

---

## Install

```bash
npm install @nestjs/cache-manager cache-manager keyv
# Optional — store adapters (auto-loaded at runtime):
npm install cacheable               # memory (KeyvCacheableMemory)
npm install @keyv/redis             # Redis
npm install @keyv/valkey            # Valkey
```

## Quick Start

```ts
import { CacheModule } from '@nestjs/cache-manager';
import { configCache } from '@os.io/nest-kit/bootstrap';
import Keyv from 'keyv';

@Module({
  imports: [CacheModule.register(configCache({ keyv: Keyv }))],
})
export class AppModule {}
```

Default: in-memory cache, `ttl: 60s`, `max: 100`. Adapters are loaded automatically.

## How It Works

Store types are auto-detected from `CACHE_URL`:

| URL value      | Store type     |
| -------------- | -------------- |
| _(empty)_      | `memory`       |
| `redis://...`  | `valkey`       |
| `rediss://...` | `valkey` + TLS |

`CACHE_TYPE` (optional) overrides `valkey` → `redis` at the same position.

```bash
# 3 stores: memory, redis, valkey
CACHE_URL=|redis://host1:6379/0|redis://host2:6379/0
CACHE_TYPE=|redis|
```

Position in `CACHE_URL` / `CACHE_TYPE` / `CACHE_PREFIX` must match.

## .env Example

```bash
# ----- Single Redis -----
CACHE_URL=redis://localhost:6379/0
CACHE_TYPE=redis
CACHE_PREFIX=myapp:

# ----- Single Valkey (default for non-empty URL) -----
CACHE_URL=redis://localhost:6379/0

# ----- Multi-store (memory + Redis) -----
CACHE_URL=|redis://localhost:6379/0
CACHE_TYPE=|redis

# ----- Multi-store (Redis + Valkey) -----
CACHE_URL=redis://host1:6379/0|redis://host2:6379/0
CACHE_TYPE=redis|
CACHE_PREFIX=prefix1:|prefix2:

# ----- RDS / ElastiCache (TLS auto-detected from rediss://) -----
CACHE_URL=rediss://my-elasticache.cache.amazonaws.com:6379/0

# ----- Global module -----
# CACHE_IS_GLOBAL=true
```

## Multi-Store

```bash
CACHE_URL=|redis://localhost:6379/0
CACHE_TYPE=|redis
```

## RDS / ElastiCache Mode

Use `rediss://` protocol to enable TLS automatically:

```bash
CACHE_URL=rediss://my-elasticache.cache.amazonaws.com:6379/0
```

## Environment Variables

| Variable          | Default | Description                                                             |
| ----------------- | ------- | ----------------------------------------------------------------------- |
| `CACHE_URL`       | —       | Pipe-separated URLs. Empty = memory. `rediss://` = TLS. Position-based. |
| `CACHE_TYPE`      | —       | Pipe-separated overrides (`redis`). Changes valkey → redis at position. |
| `CACHE_PREFIX`    | —       | Pipe-separated key prefixes. Position matches `CACHE_URL`.              |
| `CACHE_TTL`       | `60`    | Default TTL (seconds)                                                   |
| `CACHE_MAX`       | `100`   | Max items (memory store)                                                |
| `CACHE_IS_GLOBAL` | `false` | Register as global module                                               |

## API

```ts
configCache(options?: CacheConfigOptions, configService?: ConfigService): Record<string, unknown>
```

### `CacheConfigOptions`

| Option     | Type               | Default | Description                            |
| ---------- | ------------------ | ------- | -------------------------------------- |
| `ttl`      | `number`           | `60`    | Default TTL (seconds)                  |
| `isGlobal` | `boolean`          | `false` | Register as global module              |
| `keyv`     | `Keyv` constructor | —       | When provided, builds `Keyv` instances |

### Return value

- **With `keyv`**: object with a single `store` (Keyv instance) or `stores` (Keyv multi-store).
- **Without `keyv`**: flat raw config with `stores` array when multiple stores.
