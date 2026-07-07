# @os.io/nest-kit — Queue Bootstrapper

Build `BullModule.forRoot()` / `registerQueue()` options from environment variables or `ConfigService`.

Supports **BullMQ** with Redis connection, prefix, default job options, and per-queue configuration.

---

- [Install](#install)
- [Quick Start](#quick-start)
- [Connection](#connection)
- [Default Job Options](#default-job-options)
- [Queue Registration](#queue-registration)
- [Environment Variables](#environment-variables)
- [API](#api)

---

## Install

```bash
npm install @nestjs/bullmq bullmq
```

## Quick Start

```ts
import { BullModule } from '@nestjs/bullmq';
import { configQueue } from '@os.io/nest-kit/bootstrap';

@Module({
  imports: [BullModule.forRoot(configQueue())],
})
export class AppModule {}
```

Default: connects to `localhost:6379`.

## .env Example

```bash
# ----- Queue (default: localhost:6379) -----
QUEUE_HOST=localhost
QUEUE_PORT=6379

# ----- Connection URL (overrides HOST/PORT) -----
# QUEUE_URL=redis://user:pass@redis.example.com:6380/2
# VALKEY_URL=valkey://valkey.internal:6380

# ----- TLS -----
# QUEUE_TLS=true

# ----- Key prefix -----
# QUEUE_PREFIX={myapp}

# ----- Default job options -----
# QUEUE_DEFAULT_ATTEMPTS=5
# QUEUE_DEFAULT_BACKOFF_TYPE=exponential
# QUEUE_DEFAULT_BACKOFF_DELAY=2000

# ----- Global module -----
# QUEUE_IS_GLOBAL=true
```

## Connection

Connection is configured via individual environment variables (`QUEUE_HOST`, `QUEUE_PORT`, etc.) or a single `QUEUE_URL` / `VALKEY_URL` / `REDIS_URL` (order of precedence).

```ts
configQueue({
  connection: {
    host: 'redis.example.com',
    port: 6380,
    password: 'secret',
    db: 2,
    tls: { rejectUnauthorized: false },
  },
});
```

## Default Job Options

Production-safe defaults: jobs are **automatically removed** on completion and failure to prevent Redis memory overflow. Configure retry attempts, backoff, and cleanup:

```ts
configQueue({
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 3600, count: 100 }, // keep for 1h, max 100
    removeOnFail: { age: 86400, count: 50 }, // keep for 24h, max 50
  },
});
```

To disable auto-removal (not recommended for production):

```ts
configQueue({
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
  },
});
```

## Queue Registration

Register specific queues with optional per-queue overrides:

```ts
import { Queue } from 'bullmq';
import { configQueue } from '@os.io/nest-kit/bootstrap';

const cfg = configQueue({
  Queue,
  queues: [
    { name: 'email', defaultJobOptions: { attempts: 5 } },
    { name: 'notifications' },
    { name: 'pdf-generation', prefix: '{pdf}' },
  ],
});

// cfg.queue — single Queue instance
// cfg.queues — array of { name, queue } when > 1 queue

@Module({
  imports: [BullModule.forRoot(cfg), BullModule.registerQueue(...cfg.queues!)],
})
export class QueueModule {}
```

## Environment Variables

| Variable                                 | Default     | Description                      |
| ---------------------------------------- | ----------- | -------------------------------- |
| `QUEUE_URL` / `VALKEY_URL` / `REDIS_URL` | —           | Redis/Valkey connection URL      |
| `QUEUE_HOST`                             | `localhost` | Redis host                       |
| `QUEUE_PORT`                             | `6379`      | Redis port                       |
| `QUEUE_PASSWORD`                         | —           | Redis password                   |
| `QUEUE_USERNAME`                         | —           | Redis username                   |
| `QUEUE_DB`                               | —           | Redis database number            |
| `QUEUE_TLS`                              | `false`     | Enable TLS                       |
| `QUEUE_PREFIX`                           | —           | Key prefix for queue keys        |
| `QUEUE_DEFAULT_ATTEMPTS`                 | —           | Default retry attempts           |
| `QUEUE_DEFAULT_BACKOFF_TYPE`             | `fixed`     | Backoff type (fixed/exponential) |
| `QUEUE_DEFAULT_BACKOFF_DELAY`            | —           | Backoff delay (milliseconds)     |
| `QUEUE_IS_GLOBAL`                        | `false`     | Register as global module        |
| `QUEUE_MAX_RETRIES_PER_REQUEST`          | `null`      | Max retries per Redis request    |
| `QUEUE_ENABLE_READY_CHECK`               | `true`      | Enable ready check               |

## API

```ts
configQueue(options?: QueueConfigOptions, configService?: ConfigService): Record<string, unknown>
```

### `QueueConfigOptions`

| Option              | Type                       | Default | Description                             |
| ------------------- | -------------------------- | ------- | --------------------------------------- |
| `connection`        | `ConnectionConfig`         | —       | Redis connection details                |
| `prefix`            | `string`                   | —       | Key prefix                              |
| `defaultJobOptions` | `BullDefaultJobOptions`    | —       | Default job options                     |
| `queues`            | `QueueRegisterConfig[]`    | —       | Queues to register                      |
| `isGlobal`          | `boolean`                  | `false` | Register as global module               |
| `Queue`             | `Queue` constructor        | —       | When provided, builds `Queue` instances |
| `FlowProducer`      | `FlowProducer` constructor | —       | Builds `FlowProducer` instance          |

### `ConnectionConfig`

| Option                 | Type                      | Default     | Description                   |
| ---------------------- | ------------------------- | ----------- | ----------------------------- |
| `host`                 | `string`                  | `localhost` | Redis host                    |
| `port`                 | `number`                  | `6379`      | Redis port                    |
| `username`             | `string`                  | —           | Redis username                |
| `password`             | `string`                  | —           | Redis password                |
| `db`                   | `number`                  | —           | Redis database number         |
| `tls`                  | `Record<string, unknown>` | —           | TLS options                   |
| `maxRetriesPerRequest` | `number \| null`          | `null`      | Max retries per Redis request |
| `enableReadyCheck`     | `boolean`                 | `true`      | Enable ready check            |

### `BullDefaultJobOptions`

| Option             | Type                          | Description                  |
| ------------------ | ----------------------------- | ---------------------------- |
| `attempts`         | `number`                      | Retry attempts               |
| `backoff`          | `\{ type, delay \}`           | Backoff strategy             |
| `removeOnComplete` | `boolean \| \{ age, count \}` | Auto-remove completed jobs   |
| `removeOnFail`     | `boolean \| \{ age, count \}` | Auto-remove failed jobs      |
| `delay`            | `number`                      | Delay before processing (ms) |
| `priority`         | `number`                      | Job priority                 |
| `timeout`          | `number`                      | Processing timeout (ms)      |
| `ttl`              | `number`                      | Job TTL (ms)                 |
| `stackTraceLimit`  | `number`                      | Stack trace limit            |
| `lifo`             | `boolean`                     | Last in, first out           |

### `QueueRegisterConfig`

| Option              | Type                    | Description                    |
| ------------------- | ----------------------- | ------------------------------ |
| `name`              | `string`                | Queue name (required)          |
| `defaultJobOptions` | `BullDefaultJobOptions` | Per-queue job options override |
| `prefix`            | `string`                | Per-queue prefix override      |
