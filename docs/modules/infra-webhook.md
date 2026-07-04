# Infra / Webhook

> Incoming & outgoing webhook handling for NestJS — HMAC signing, exponential backoff retry, circuit breaker, event bus, BullMQ queue, and TypeORM persistence.

```
@os.io/nest-kit/infra/webhook
```

---

## Features

- **Outgoing webhooks** — send with exponential backoff retry + jitter
- **HMAC signature** — verify incoming and sign outgoing payloads (SHA-256 / SHA-1)
- **Event bus** — in-memory pub/sub for decoupled webhook emission
- **Queue integration** — optional BullMQ queue for delivery that survives restarts
- **Database persistence** — optional TypeORM / custom store for delivery logs
- **Circuit breaker** — stop hammering dead URLs after repeated failures
- **Incoming webhook controller** — auto-registered controller with signature verification
- **Pluggable adapters** — GitHub, GitLab, Stripe, Sentry, Slack

---

## Installation

```bash
npm install @os.io/nest-kit
```

For BullMQ queue support:

```bash
npm install @nestjs/bullmq bullmq
```

For TypeORM persistence:

```bash
npm install @nestjs/typeorm typeorm
```

---

## Incoming Webhooks

Incoming webhooks are received via an auto-registered `POST /webhook` controller, verified by source-specific adapters, and dispatched to your handlers.

### Quick Start

```typescript
import { Module } from '@nestjs/common';
import { WebhookModule, GitHubWebhookAdapter } from '@os.io/nest-kit/infra/webhook';

@Module({
  imports: [
    WebhookModule.forRoot({
      incoming: {
        secret: 'whsec_incoming_secret',
        adapters: [new GitHubWebhookAdapter()],
        handlers: [
          async (event) => {
            console.log(`Received ${event.event} from ${event.source}`);
          },
        ],
      },
    }),
  ],
})
export class AppModule {}
```

### How it works

When `incoming` options are provided, `IncomingWebhookController` is auto-mounted at `POST /webhook`. The controller:

1. Detects the source from `User-Agent` or `x-webhook-source` header
2. Looks up the matching adapter
3. Verifies the HMAC signature via `IncomingWebhookService`
4. Calls `adapter.parse()` to normalize the event
5. Dispatches to all registered handlers

| Header / User-Agent       | Source   |
| ------------------------- | -------- |
| `GitHub-Hookshot`         | `github` |
| `GitLab`                  | `gitlab` |
| `Stripe`                  | `stripe` |
| `Sentry`                  | `sentry` |
| `Slack`                   | `slack`  |
| `x-webhook-source` header | Custom   |

### Adapters

Each adapter knows how to parse and verify webhooks from a specific provider.

:::tabs

== GitHub

Parses `x-github-event` and `x-github-delivery` headers. Verifies using `x-hub-signature-256` (SHA-256).

```typescript
import { GitHubWebhookAdapter } from '@os.io/nest-kit/infra/webhook';

const adapter = new GitHubWebhookAdapter();
```

| Header                | Description            |
| --------------------- | ---------------------- |
| `x-github-event`      | Event name (`push`)    |
| `x-github-delivery`   | Unique delivery GUID   |
| `x-hub-signature-256` | `sha256=hex` signature |

```typescript
// Parsed event shape
{
  source: 'github',
  event: 'push',
  payload: {
    event: 'push',
    delivery: 'abc-123',
    action: undefined,
    ref: 'refs/heads/main',
    repository: { /* ... */ },
    // ... full GitHub payload
  }
}
```

== GitLab

Parses `x-gitlab-event` header. Verifies via HMAC SHA-256 with `x-hub-signature`.

```typescript
import { GitLabWebhookAdapter } from '@os.io/nest-kit/infra/webhook';

const adapter = new GitLabWebhookAdapter();
```

| Header            | Description        |
| ----------------- | ------------------ |
| `x-gitlab-event`  | Event name         |
| `x-gitlab-token`  | Token verification |
| `x-hub-signature` | HMAC SHA-256       |

== Stripe

Parses `type` field from JSON body. Signature verification is delegated to Stripe SDK's `constructEvent()`.

```typescript
import { StripeWebhookAdapter } from '@os.io/nest-kit/infra/webhook';

const adapter = new StripeWebhookAdapter();
```

| Header             | Description             |
| ------------------ | ----------------------- |
| `stripe-signature` | Stripe SDK verification |

> **Note:** Use the dedicated Stripe module (`@os.io/nest-kit/infra/stripe`) for production webhook handling with full SDK verification.

== Sentry

Parses `event` and `action` fields from JSON body. Verifies via HMAC SHA-256 with `sentry-hook-signature`.

```typescript
import { SentryWebhookAdapter } from '@os.io/nest-kit/infra/webhook';

const adapter = new SentryWebhookAdapter();
```

| Header                  | Description  |
| ----------------------- | ------------ |
| `sentry-hook-signature` | HMAC SHA-256 |

== Slack

Parses Slack's JSON payload. Verifies using Slack's versioned HMAC scheme (`v0`) with `x-slack-signature` and `x-slack-request-timestamp`.

```typescript
import { SlackWebhookAdapter } from '@os.io/nest-kit/infra/webhook';

const adapter = new SlackWebhookAdapter();
```

| Header                      | Description                          |
| --------------------------- | ------------------------------------ |
| `x-slack-signature`         | `v0=hex` signature                   |
| `x-slack-request-timestamp` | Unix timestamp for replay protection |

:::

### Custom adapter

Implement `IncomingWebhookAdapter` for any source:

```typescript
import type { IncomingWebhookAdapter, IncomingWebhookEvent } from '@os.io/nest-kit/infra/webhook';

export class ShopifyWebhookAdapter implements IncomingWebhookAdapter {
  readonly source = 'shopify';

  parse(
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): IncomingWebhookEvent {
    return {
      source: 'shopify',
      headers,
      body,
      event: (headers['x-shopify-topic'] as string) ?? 'unknown',
      payload: body,
    };
  }

  verify(body: unknown, signature: string, secret: string): boolean {
    // HMAC verification logic
    return true;
  }
}
```

### Normalized event shape

All adapters return a consistent `IncomingWebhookEvent`:

```typescript
interface IncomingWebhookEvent {
  source: string; // 'github', 'stripe', 'shopify', etc.
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  event?: string; // normalized event name (e.g. 'push', 'order.created')
  payload?: unknown; // adapter-transformed payload
}
```

### Signature verification table

| Adapter | Header                   | Algorithm |
| ------- | ------------------------ | --------- |
| GitHub  | `x-hub-signature-256`    | SHA-256   |
| GitLab  | `x-gitlab-token` / HMAC  | SHA-256   |
| Stripe  | `stripe-signature`       | SDK-based |
| Sentry  | `sentry-hook-signature`  | SHA-256   |
| Slack   | `x-slack-signature` (v0) | SHA-256   |

---

## Outgoing Webhooks

Deliver webhooks to external endpoints with exponential backoff retry, HMAC signing, and circuit breaker protection.

### Basic usage

```typescript
import { Injectable } from '@nestjs/common';
import { OutgoingWebhookService } from '@os.io/nest-kit/infra/webhook';

@Injectable()
export class OrderService {
  constructor(private readonly webhook: OutgoingWebhookService) {}

  async orderCreated(order: Order) {
    const result = await this.webhook.send('https://partner.example.com/webhook', 'order.created', {
      id: order.id,
      total: order.total,
    });

    console.log(`Delivery status: ${result.status}`); // 'delivered' | 'failed'
  }
}
```

### Retry strategy

Exponential backoff with jitter, capped at 300 seconds:

| Attempt | Delay      |
| ------- | ---------- |
| 1       | ~1,000 ms  |
| 2       | ~2,000 ms  |
| 3       | ~4,000 ms  |
| 4       | ~8,000 ms  |
| 5       | ~16,000 ms |
| 6+      | ... capped |

### HMAC signing

When `signingSecret` is configured, every outgoing request includes:

| Header                          | Description                         |
| ------------------------------- | ----------------------------------- |
| `x-webhook-signature`           | HMAC hex digest of the payload body |
| `x-webhook-signature-algorithm` | Hash algorithm (`sha256` / `sha1`)  |
| `x-webhook-id`                  | Unique delivery identifier          |
| `x-webhook-event`               | Event name                          |
| `x-webhook-attempt`             | Current attempt number              |

```typescript
WebhookModule.forRoot({
  outgoing: {
    signingSecret: 'whsec_xxx',
    algorithm: 'sha256', // or 'sha1'
  },
});
```

### Per-call options

```typescript
await this.webhook.send(url, event, data, {
  maxRetries: 3,
  baseDelayMs: 500,
  timeout: 5000,
});
```

---

## Circuit Breaker

Prevents hammering dead endpoints. Tracks failures per URL and transitions through three states.

```typescript
WebhookModule.forRoot({
  circuitBreaker: {
    failureThreshold: 5, // failures before opening
    cooldownMs: 30000, // wait 30s before probing
    halfOpenSuccessThreshold: 3, // successful probes to close
  },
});
```

| State         | Behaviour                                             |
| ------------- | ----------------------------------------------------- |
| **Closed**    | Normal — requests pass through                        |
| **Open**      | Skipped (logged), cooldown counting                   |
| **Half-open** | Probe requests allowed — success = close, fail = open |

---

## Event Bus

In-memory pub/sub for decoupled webhook emission.

```typescript
import { WebhookEventBus } from '@os.io/nest-kit/infra/webhook';

// Subscribe
eventBus.on('webhook:outgoing:delivered', (event) => {
  console.log(`Delivered: ${event.payload.recordId}`);
});

// Emit
eventBus.emit('order.shipped', { orderId: 123 });
```

### Emitted events

| Event                        | When                          |
| ---------------------------- | ----------------------------- |
| `webhook:outgoing:started`   | Delivery begins               |
| `webhook:outgoing:delivered` | Delivery succeeded            |
| `webhook:outgoing:skipped`   | Circuit breaker open, skipped |
| `webhook:outgoing:exhausted` | All retries exhausted         |
| `webhook:incoming:<source>`  | Incoming webhook by source    |
| `webhook:incoming`           | All incoming webhooks         |

---

## Queue Integration (BullMQ)

When `@nestjs/bullmq` is installed, enqueue deliveries for async processing that survives restarts:

```typescript
import { createBullMqWorker } from '@os.io/nest-kit/infra/webhook';

// Dynamically create a BullMQ WorkerHost
const WorkerClass = await createBullMqWorker(); // null if not installed
```

```typescript
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'webhook:outgoing' }),
    WebhookModule.forRoot({
      outgoing: { signingSecret: 'whsec_xxx' },
    }),
  ],
  providers: [
    // Inject WorkerClass from createBullMqWorker()
  ],
})
```

> **Note:** BullMQ (`@nestjs/bullmq`, `bullmq`) is an **optional peer dependency**.

---

## Storage & Delivery Logs

:::tabs

== Memory store

For development and testing:

```typescript
import { WebhookMemoryStore } from '@os.io/nest-kit/infra/webhook';

WebhookModule.forRoot({
  storage: {
    enabled: true,
    store: new WebhookMemoryStore(),
  },
});
```

== TypeORM store

Persistent delivery logs using TypeORM:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WebhookModule,
  WebhookDeliveryEntity,
  WebhookTypeormStore,
} from '@os.io/nest-kit/infra/webhook';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookDeliveryEntity]),
    WebhookModule.forRootAsync({
      useFactory: (repo: Repository<WebhookDeliveryEntity>) => ({
        outgoing: { signingSecret: 'whsec_xxx' },
        storage: {
          enabled: true,
          store: new WebhookTypeormStore(repo),
        },
      }),
      inject: [getRepositoryToken(WebhookDeliveryEntity)],
    }),
  ],
})
export class MyFeatureModule {}
```

The `webhook_deliveries` table:

| Column         | Type      | Description                      |
| -------------- | --------- | -------------------------------- |
| `id`           | UUID      | Primary key                      |
| `url`          | varchar   | Target URL                       |
| `event`        | varchar   | Event name                       |
| `payload`      | text      | Serialized request body          |
| `status`       | varchar   | `pending`, `delivered`, `failed` |
| `statusCode`   | int?      | HTTP response status             |
| `responseBody` | text?     | HTTP response body               |
| `error`        | text?     | Error message                    |
| `attempts`     | int       | Delivery attempt count           |
| `maxRetries`   | int       | Maximum retry count              |
| `nextRetryAt`  | datetime? | Next scheduled retry             |
| `createdAt`    | datetime  | Record created                   |
| `updatedAt`    | datetime  | Record last updated              |

== Custom store

Implement `WebhookDeliveryStore`:

```typescript
import type { WebhookDeliveryStore, WebhookDeliveryRecord } from '@os.io/nest-kit/infra/webhook';

export class MyCustomStore implements WebhookDeliveryStore {
  async save(record) {
    /* ... */
  }
  async update(id, partial) {
    /* ... */
  }
  async findById(id) {
    /* ... */
  }
  async findPendingRetries(before, limit) {
    /* ... */
  }
}
```

:::

---

## Utilities

### HMAC signing

```typescript
import {
  signPayload,
  verifySignature,
  buildSignatureHeader,
  parseSignatureHeader,
} from '@os.io/nest-kit/infra/webhook';

// Sign a payload
const { signature, algorithm } = signPayload('{"hello":"world"}', 'mysecret', 'sha256');

// Verify with timing-safe comparison
const valid = verifySignature('{"hello":"world"}', signature, 'mysecret', 'sha256');

// Build GitHub-style header
const header = buildSignatureHeader('{"hello":"world"}', 'mysecret', 'sha1');
// → 'sha1=abc123...'

// Parse incoming header
const parsed = parseSignatureHeader('sha256=def456...');
// → { algorithm: 'sha256', signature: 'def456...' }
```

---

## Async Configuration

```typescript
WebhookModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    outgoing: {
      signingSecret: config.get('WEBHOOK_OUTGOING_SECRET'),
      maxRetries: config.get('WEBHOOK_MAX_RETRIES', 5),
    },
    incoming: {
      secret: config.get('WEBHOOK_INCOMING_SECRET'),
      adapters: [new GitHubWebhookAdapter()],
    },
    circuitBreaker: {
      failureThreshold: config.get('CB_FAILURE_THRESHOLD', 5),
    },
  }),
  inject: [ConfigService],
  imports: [ConfigModule],
});
```

---

## API Reference

### WebhookModule

| Method                  | Description                            |
| ----------------------- | -------------------------------------- |
| `forRoot(options)`      | Synchronous configuration              |
| `forRootAsync(options)` | Async configuration (factory + inject) |

### OutgoingWebhookService

| Method                             | Description                |
| ---------------------------------- | -------------------------- |
| `send(url, event, data, options?)` | Deliver webhook with retry |

### IncomingWebhookService

| Method                            | Description                |
| --------------------------------- | -------------------------- |
| `verify(adapter, body, headers)`  | Verify HMAC signature      |
| `process(adapter, body, headers)` | Verify, parse, emit to bus |

### WebhookEventBus

| Method                 | Description                |
| ---------------------- | -------------------------- |
| `on(type, listener)`   | Subscribe to event type    |
| `onAny(listener)`      | Subscribe to all events    |
| `off(type, listener)`  | Remove event listener      |
| `offAny(listener)`     | Remove wildcard listener   |
| `emit(type, payload)`  | Emit event asynchronously  |
| `clear()`              | Remove all listeners       |
| `listenerCount(type?)` | Count registered listeners |

### WebhookCircuitBreaker

| Method                 | Description                 |
| ---------------------- | --------------------------- |
| `isAllowed(url)`       | Check if request is allowed |
| `onSuccess(url)`       | Record successful delivery  |
| `onFailure(url)`       | Record failed delivery      |
| `getCircuitState(url)` | Get current state for URL   |
| `reset(url)`           | Reset circuit for a URL     |
| `resetAll()`           | Reset all circuits          |
