# Webhook — `@os.io/nest-kit/infra/webhook`

Incoming & outgoing webhook handling for NestJS — HMAC signing, exponential backoff retry, circuit breaker, event bus, BullMQ queue, and TypeORM persistence.

## Features

- **Outgoing webhooks** — send with exponential backoff retry + jitter
- **HMAC signature** — verify incoming and sign outgoing payloads (SHA-256 / SHA-1)
- **Event bus** — in-memory pub/sub for decoupled webhook emission
- **Queue integration** — optional BullMQ queue for delivery that survives restarts
- **Database persistence** — optional TypeORM / custom store for delivery logs
- **Circuit breaker** — stop hammering dead URLs after repeated failures
- **Incoming webhook controller** — auto-registered controller with signature verification
- **Pluggable adapters** — GitHub, GitLab, Stripe, Sentry, Slack

## Installation

```bash
npm install @os.io/nest-kit
# Optional: for queue support
npm install @nestjs/bullmq bullmq
# Optional: for persistence
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

### Source detection

| Header / User-Agent       | Source   |
| ------------------------- | -------- |
| `GitHub-Hookshot`         | `github` |
| `GitLab`                  | `gitlab` |
| `Stripe`                  | `stripe` |
| `Sentry`                  | `sentry` |
| `Slack`                   | `slack`  |
| `x-webhook-source` header | Custom   |

### Adapters

:::tabs

== GitHub

Parses `x-github-event` and `x-github-delivery` headers. Verifies using `x-hub-signature-256` (SHA-256).

```typescript
import { GitHubWebhookAdapter } from '@os.io/nest-kit/infra/webhook';

const adapter = new GitHubWebhookAdapter();
```

```typescript
// Parsed event shape
{
  source: 'github',
  event: 'push',
  payload: {
    event: 'push',
    delivery: 'abc-123',
    ref: 'refs/heads/main',
  }
}
```

== GitLab

Parses `x-gitlab-event` header. Verifies via HMAC SHA-256 with `x-hub-signature`.

```typescript
import { GitLabWebhookAdapter } from '@os.io/nest-kit/infra/webhook';

const adapter = new GitLabWebhookAdapter();
```

== Stripe

Signature verification delegated to Stripe SDK's `constructEvent()`.

```typescript
import { StripeWebhookAdapter } from '@os.io/nest-kit/infra/webhook';

const adapter = new StripeWebhookAdapter();
```

> **Note:** Use `@os.io/nest-kit/infra/stripe` for production with full SDK verification.

== Sentry

Verifies via HMAC SHA-256 with `sentry-hook-signature`.

```typescript
import { SentryWebhookAdapter } from '@os.io/nest-kit/infra/webhook';

const adapter = new SentryWebhookAdapter();
```

== Slack

Verifies using Slack's versioned HMAC scheme (`v0`) with `x-slack-signature` and `x-slack-request-timestamp`.

```typescript
import { SlackWebhookAdapter } from '@os.io/nest-kit/infra/webhook';

const adapter = new SlackWebhookAdapter();
```

:::

### Custom adapter

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
    return true;
  }
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

### Usage

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
    // result.status → 'delivered' | 'failed'
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
    algorithm: 'sha256',
  },
});
```

---

## Circuit Breaker

States: `closed` → `open` (after N failures) → `half_open` (after cooldown) → `closed` (after N successful probes).

```typescript
WebhookModule.forRoot({
  circuitBreaker: {
    failureThreshold: 5,
    cooldownMs: 30000,
    halfOpenSuccessThreshold: 3,
  },
});
```

---

## Event Bus

```typescript
import { WebhookEventBus } from '@os.io/nest-kit/infra/webhook';

eventBus.on('webhook:outgoing:delivered', (event) => {
  console.log('Delivered:', event.payload.recordId);
});
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

```typescript
import { createBullMqWorker } from '@os.io/nest-kit/infra/webhook';

const WorkerClass = await createBullMqWorker(); // null if @nestjs/bullmq not installed
```

---

## Storage & Delivery Logs

:::tabs

== Memory store

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

== Custom store

```typescript
import type { WebhookDeliveryStore } from '@os.io/nest-kit/infra/webhook';

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

```typescript
import {
  signPayload,
  verifySignature,
  buildSignatureHeader,
  parseSignatureHeader,
} from '@os.io/nest-kit/infra/webhook';

const { signature, algorithm } = signPayload('{"msg":"hello"}', 'secret', 'sha256');
const valid = verifySignature('{"msg":"hello"}', signature, 'secret', 'sha256');
const header = buildSignatureHeader('{"msg":"hello"}', 'secret', 'sha1');
const parsed = parseSignatureHeader('sha256=abc123...');
```

## Async configuration

```typescript
WebhookModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    outgoing: { signingSecret: config.get('WEBHOOK_SECRET') },
    incoming: {
      secret: config.get('WEBHOOK_INCOMING_SECRET'),
      adapters: [new GitHubWebhookAdapter()],
    },
  }),
  inject: [ConfigService],
});
```

## Types

All public types are exported from `@os.io/nest-kit/infra/webhook`:

- `WebhookModuleOptions`, `OutgoingWebhookOptions`, `IncomingWebhookModuleOptions`
- `WebhookDeliveryStore`, `WebhookDeliveryRecord`, `WebhookDeliveryStatus`
- `IncomingWebhookAdapter`, `IncomingWebhookEvent`, `IncomingWebhookHandler`
- `WebhookHashAlgorithm`, `CircuitBreakerOptions`, `WebhookEvent`, `WebhookEventListener`
