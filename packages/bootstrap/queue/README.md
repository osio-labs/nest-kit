# @os.io/nest-kit — Queue Bootstrapper

Build `BullModule.forRoot()` options from environment variables or `ConfigService`.

Supports **BullMQ** with Redis connection, prefix, and default job options.

---

- [Install](#install)
- [Quick Start](#quick-start)
- [Connection](#connection)
- [Default Job Options](#default-job-options)
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

## .env Example

```bash
# ----- Queue (required) -----
QUEUE_URL=redis://localhost:6379

# ----- Key prefix -----
# QUEUE_PREFIX={myapp}
```

## Connection

Connection is configured via `QUEUE_URL`. BullMQ handles `rediss://` TLS natively.

| Variable    | Description                 |
| ----------- | --------------------------- |
| `QUEUE_URL` | Redis/Valkey connection URL |

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

## Environment Variables

| Variable       | Default | Description                 |
| -------------- | ------- | --------------------------- |
| `QUEUE_URL`    | —       | Redis/Valkey connection URL |
| `QUEUE_PREFIX` | —       | Key prefix for queue keys   |

## API

```ts
configQueue(options?: QueueConfigOptions, configService?: ConfigService): Record<string, unknown>
```

### `QueueConfigOptions`

| Option              | Type                    | Default | Description               |
| ------------------- | ----------------------- | ------- | ------------------------- |
| `prefix`            | `string`                | —       | Key prefix                |
| `defaultJobOptions` | `BullDefaultJobOptions` | —       | Default job options       |
| `isGlobal`          | `boolean`               | `false` | Register as global module |

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
