/**
 * @os.io/nest-kit/infra/stripe
 *
 * Stripe payment processing for NestJS — payment intents, refunds,
 * payment methods, customers, subscriptions, checkout, webhooks,
 * products/prices, idempotency, sandbox, REST controller, and
 * optional ACID transaction store with state-machine-enforced
 * payment intent transitions.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { StripeModule } from '@os.io/nest-kit/infra/stripe';
 *
 * @Module({
 *   imports: [
 *     StripeModule.forRoot({
 *       apiKey: process.env.STRIPE_SECRET_KEY,
 *       webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @module
 * @packageDocumentation
 */

// ──────── Types ────────
export type {
  StripeModuleOptions,
  StripeModuleAsyncOptions,
  CreatePaymentIntentOptions,
  ConfirmPaymentIntentOptions,
  CapturePaymentIntentOptions,
  UpdatePaymentIntentOptions,
  CreateRefundOptions,
  CreateCustomerOptions,
  CreateSubscriptionOptions,
  UpdateSubscriptionOptions,
  CreateCheckoutSessionOptions,
  CreateBillingPortalOptions,
  AttachPaymentMethodOptions,
  ListProductsOptions,
  ListPricesOptions,
  PaymentIntentStatus,
  PaymentIntentRecord,
  RefundRecord,
  StripeEventPayload,
  StripeSDK,
  StripeError,
  RefundStatus,
  StripeWebhookHandler,
  PaymentIntentResult,
  RefundResult,
  PaymentMethodResult,
  SubscriptionStatus,
  InvoiceResult,
} from './stripe.types.js';

// ──────── Payment Store ────────
export { PaymentStore } from './store/payment-store.js';

// ──────── State Machine ────────
export {
  VALID_TRANSITIONS,
  assertValidTransition,
  PAYMENT_INTENT_FINAL_STATUSES,
} from './store/state-machine.js';

// ──────── Constants ────────
export {
  STRIPE_MODULE_OPTIONS,
  STRIPE_CLIENT,
  PAYMENT_STORE,
  STRIPE_WEBHOOK_HANDLERS,
  IDEMPOTENCY_CACHE,
  DEFAULT_IDEMPOTENCY_TTL,
  DEFAULT_CURRENCY,
} from './stripe.constants.js';

// ──────── Sandbox ────────
export { StripeSandboxClient, SANDBOX_TEST_CARDS } from './stripe-sandbox.client.js';

// ──────── Services ────────
export { StripeService } from './stripe.service.js';
export { PaymentIntentsService } from './services/payment-intents.service.js';
export { RefundsService } from './services/refunds.service.js';
export { PaymentMethodsService } from './services/payment-methods.service.js';
export { CustomersService } from './services/customers.service.js';
export { SubscriptionsService } from './services/subscriptions.service.js';
export { CheckoutService } from './services/checkout.service.js';
export { BillingPortalService } from './services/billing-portal.service.js';
export { WebhooksService } from './services/webhooks.service.js';
export { ProductsService } from './services/products.service.js';

// ──────── NestJS Module & Controller ────────
export { StripeModule } from './stripe.module.js';
export { StripeController } from './stripe.controller.js';
