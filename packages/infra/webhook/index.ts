/**
 * @os.io/nest-kit/infra/webhook
 *
 * Incoming & outgoing webhook handling for NestJS applications.
 *
 * ## Features
 *
 * - **Outgoing webhooks** — send with exponential backoff retry
 * - **HMAC signature** — verify incoming and sign outgoing payloads (SHA-256 / SHA-1)
 * - **Event bus** — in-memory pub/sub for decoupled webhook emission
 * - **Queue integration** — optional `@nestjs/bullmq` queue for delivery that survives restarts
 * - **Database persistence** — optional TypeORM / custom store for delivery logs
 * - **Circuit breaker** — stop hammering dead URLs after repeated failures
 * - **Incoming webhook controller** — auto-registered controller with signature verification
 * - **Pluggable adapters** — GitHub, GitLab, Stripe, Sentry, Slack
 *
 * @module
 * @packageDocumentation
 */

export { WebhookModule } from './webhook.module';
export { WebhookEventBus } from './event-bus';
export { WebhookCircuitBreaker } from './circuit-breaker';
export { OutgoingWebhookService } from './outgoing/outgoing-webhook.service';
export { OutgoingWebhookProcessor } from './outgoing/queue/outgoing-webhook.processor';
export { IncomingWebhookController } from './incoming/incoming-webhook.controller';
export { IncomingWebhookService } from './incoming/incoming-webhook.service';
export {
  signPayload,
  verifySignature,
  buildSignatureHeader,
  parseSignatureHeader,
} from './webhook.utils';
export { WebhookMemoryStore } from './stores/memory.store';
export { WebhookTypeormStore } from './stores/typeorm.store';
export { WebhookDeliveryEntity } from './stores/typeorm.entity';

export {
  WEBHOOK_MODULE_OPTIONS,
  OUTGOING_WEBHOOK_OPTIONS,
  INCOMING_WEBHOOK_OPTIONS,
  WEBHOOK_EVENT_BUS,
  WEBHOOK_CIRCUIT_BREAKER,
  WEBHOOK_DELIVERY_STORE,
  INCOMING_WEBHOOK_ADAPTERS,
  INCOMING_WEBHOOK_HANDLERS,
} from './webhook.constants';

export type {
  WebhookHashAlgorithm,
  WebhookDeliveryStatus,
  OutgoingWebhookPayload,
  WebhookDeliveryRecord,
  WebhookDeliveryStore,
  OutgoingWebhookOptions,
  CircuitBreakerOptions,
  CircuitBreakerState,
  HmacResult,
  IncomingWebhookEvent,
  IncomingWebhookHandler,
  IncomingWebhookAdapter,
  IncomingWebhookModuleOptions,
  WebhookModuleOptions,
  WebhookModuleAsyncOptions,
  WebhookEvent,
  WebhookEventListener,
} from './webhook.types';

export * from './incoming/adapters';
