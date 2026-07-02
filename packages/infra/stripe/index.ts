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
} from './stripe.types';

// ──────── Payment Store ────────
export { PaymentStore } from './store/payment-store';

// ──────── State Machine ────────
export {
  VALID_TRANSITIONS,
  assertValidTransition,
  PAYMENT_INTENT_FINAL_STATUSES,
} from './store/state-machine';

// ──────── Constants ────────
export {
  STRIPE_MODULE_OPTIONS,
  STRIPE_CLIENT,
  PAYMENT_STORE,
  STRIPE_WEBHOOK_HANDLERS,
  IDEMPOTENCY_CACHE,
  DEFAULT_IDEMPOTENCY_TTL,
  DEFAULT_CURRENCY,
} from './stripe.constants';

// ──────── Sandbox ────────
export { StripeSandboxClient, SANDBOX_TEST_CARDS } from './stripe-sandbox.client';

// ──────── Services ────────
export { StripeService } from './stripe.service';
export { PaymentIntentsService } from './services/payment-intents.service';
export { RefundsService } from './services/refunds.service';
export { PaymentMethodsService } from './services/payment-methods.service';
export { CustomersService } from './services/customers.service';
export { SubscriptionsService } from './services/subscriptions.service';
export { CheckoutService } from './services/checkout.service';
export { BillingPortalService } from './services/billing-portal.service';
export { WebhooksService } from './services/webhooks.service';
export { ProductsService } from './services/products.service';

// ──────── NestJS Module & Controller ────────
export { StripeModule } from './stripe.module';
export { StripeController } from './stripe.controller';
