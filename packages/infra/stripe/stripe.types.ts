import type { Stripe } from 'stripe';

// ──────── Module options ────────

/** Options accepted by `StripeModule.forRoot()`. */
export interface StripeModuleOptions {
  /** Stripe secret API key (`sk_live_xxx` or `sk_test_xxx`). */
  apiKey: string;

  /** Webhook signing secret for event validation. */
  webhookSecret?: string;

  /** Default currency for all requests (defaults to `usd`). */
  defaultCurrency?: string;

  /**
   * TTL for auto-generated idempotency keys in milliseconds.
   * Defaults to 3600000 (1 hour).
   */
  idempotencyTtl?: number;

  /**
   * Static metadata merged into every Stripe object created by this module.
   */
  metadata?: Record<string, string>;

  /**
   * Optional `PaymentStore` implementation class.
   * When provided, payment intent and refund records are persisted
   * and legal status transitions are enforced via `VALID_TRANSITIONS`.
   */
  PaymentStore?: new (...args: unknown[]) => PaymentStore;

  /**
   * Enable sandbox mode. When `true`, a mock `StripeSandboxClient` is used
   * instead of the real Stripe SDK — no API calls are made.
   *
   * Useful for development, CI, and integration tests.
   */
  sandbox?: boolean;

  /**
   * Registered webhook event handlers. Each handler is called when a
   * matching Stripe webhook event arrives at the `/stripe/webhook` endpoint.
   */
  webhookHandlers?: StripeWebhookHandler[];
}

/** Options accepted by `StripeModule.forRootAsync()`. */
export interface StripeModuleAsyncOptions {
  useFactory: (...args: unknown[]) => Promise<StripeModuleOptions> | StripeModuleOptions;
  inject?: any[];
  imports?: any[];
  global?: boolean;
}

// ──────── Payment Intents ────────

/** Options for creating a payment intent. */
export interface CreatePaymentIntentOptions {
  amount: number;
  currency?: string;
  customer?: string;
  paymentMethod?: string;
  description?: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
  confirm?: boolean;
  captureMethod?: 'automatic' | 'manual' | 'automatic_async';
  setupFutureUsage?: 'on_session' | 'off_session';
  statementDescriptor?: string;
  returnUrl?: string;
}

/** Options for confirming a payment intent. */
export interface ConfirmPaymentIntentOptions {
  paymentMethod?: string;
  returnUrl?: string;
  idempotencyKey?: string;
}

/** Options for capturing a payment intent. */
export interface CapturePaymentIntentOptions {
  amountToCapture?: number;
  idempotencyKey?: string;
}

/** Options for updating a payment intent. */
export interface UpdatePaymentIntentOptions {
  amount?: number;
  description?: string;
  metadata?: Record<string, string>;
  currency?: string;
  idempotencyKey?: string;
}

// ──────── Refunds ────────

/** Options for creating a refund. */
export interface CreateRefundOptions {
  paymentIntent: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}

// ──────── Customers ────────

/** Options for creating a customer. */
export interface CreateCustomerOptions {
  email?: string;
  name?: string;
  phone?: string;
  description?: string;
  metadata?: Record<string, string>;
  paymentMethod?: string;
  idempotencyKey?: string;
}

// ──────── Subscriptions ────────

/** Options for creating a subscription. */
export interface CreateSubscriptionOptions {
  customer: string;
  items: { price: string; quantity?: number }[];
  paymentBehavior?: 'default_incomplete' | 'pending_if_incomplete' | 'error_if_incomplete';
  metadata?: Record<string, string>;
  idempotencyKey?: string;
  trialPeriodDays?: number;
  cancelAtPeriodEnd?: boolean;
}

/** Options for updating a subscription. */
export interface UpdateSubscriptionOptions {
  items?: { price: string; quantity?: number }[];
  metadata?: Record<string, string>;
  cancelAtPeriodEnd?: boolean;
  idempotencyKey?: string;
}

// ──────── Checkout ────────

/** Options for creating a checkout session. */
export interface CreateCheckoutSessionOptions {
  customer?: string;
  mode: 'payment' | 'setup' | 'subscription';
  lineItems: { price: string; quantity: number }[];
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
  allowPromotionCodes?: boolean;
  customerEmail?: string;
}

// ──────── Billing Portal ────────

/** Options for creating a billing portal session. */
export interface CreateBillingPortalOptions {
  customer: string;
  returnUrl: string;
  idempotencyKey?: string;
}

// ──────── Payment Methods ────────

/** Options for attaching a payment method. */
export interface AttachPaymentMethodOptions {
  paymentMethod: string;
  customer: string;
}

// ──────── Products & Prices ────────

/** Options for listing products. */
export interface ListProductsOptions {
  limit?: number;
  active?: boolean;
}

/** Options for listing prices. */
export interface ListPricesOptions {
  limit?: number;
  active?: boolean;
  product?: string;
  currency?: string;
}

// ──────── Payment intent status (state machine) ────────

/**
 * Payment intent status as defined by Stripe.
 * Used by the state machine when a `PaymentStore` is active.
 */
export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled';

// ──────── Payment Store records ────────

/** Record persisted by `PaymentStore` for a payment intent. */
export interface PaymentIntentRecord {
  id: string;
  stripeId: string;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

/** Record persisted by `PaymentStore` for a refund. */
export interface RefundRecord {
  id: string;
  stripeId: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  reason?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

// ──────── Webhook ────────

/** A typed webhook event dispatched by `WebhooksService`. */
export interface StripeEventPayload<T = unknown> {
  type: string;
  data: T;
  raw: Stripe.Event;
}

// ──────── Payment Store (abstract) ────────

/**
 * Abstract class for persisting payment lifecycle data.
 *
 * Extend this class and provide it via `StripeModuleOptions.PaymentStore`
 * to persist payment intents and refunds to a database and enforce
 * legal status transitions.
 */
export abstract class PaymentStore {
  abstract createPaymentIntent(
    data: Omit<PaymentIntentRecord, 'createdAt' | 'updatedAt'>,
  ): Promise<void>;

  abstract updatePaymentIntentStatus(stripeId: string, status: PaymentIntentStatus): Promise<void>;

  abstract getPaymentIntent(stripeId: string): Promise<PaymentIntentRecord | null>;

  abstract listPaymentIntents(customerId?: string): Promise<PaymentIntentRecord[]>;

  abstract createRefund(data: Omit<RefundRecord, 'createdAt' | 'updatedAt'>): Promise<void>;

  abstract updateRefundStatus(stripeId: string, status: string): Promise<void>;

  abstract getRefund(stripeId: string): Promise<RefundRecord | null>;

  abstract listRefunds(paymentIntentId?: string): Promise<RefundRecord[]>;

  abstract acquireLock(key: string, ttlMs: number): Promise<boolean>;

  abstract releaseLock(key: string): Promise<void>;
}

// ──────── Refund status ────────

/** Refund status as defined by Stripe. */
export type RefundStatus = 'pending' | 'succeeded' | 'failed' | 'canceled';

// ──────── Webhook handler ────────

/** A registered webhook event handler. */
export type StripeWebhookHandler = (event: any) => void | Promise<void>;

// ──────── Normalized result types ────────

/** Normalized payment intent result returned by the service. */
export interface PaymentIntentResult {
  id: string;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  customerId?: string;
  paymentMethodId?: string;
  clientSecret?: string;
  nextAction?: {
    type: string;
    redirectUrl?: string;
  };
  lastPaymentError?: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

/** Normalized refund result. */
export interface RefundResult {
  id: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason?: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

/** Normalized payment method result. */
export interface PaymentMethodResult {
  id: string;
  customerId?: string;
  type: string;
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  wallet?: { type: string };
  ideal?: { bank: string };
  sepaDebit?: { last4: string; bankCode: string };
  usBankAccount?: { bankName: string; last4: string };
  metadata?: Record<string, string>;
  createdAt: string;
}

/** Normalized subscription status. */
export interface SubscriptionStatus {
  id: string;
  customerId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  plan?: {
    id: string;
    product: string;
    amount: number;
    currency: string;
    interval: 'day' | 'week' | 'month' | 'year';
  };
}

/** Normalized invoice result. */
export interface InvoiceResult {
  id: string;
  number: string;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: string;
  pdfUrl?: string;
  paidAt?: Date;
  lines: { description: string; amount: number; quantity: number }[];
}

// ──────── Stripe SDK type re-exports ────────

/** Re-exported Stripe SDK type for convenience. */
export type StripeSDK = Stripe;

/** Re-exported Stripe API error type. */
export type StripeError = Stripe.errors.StripeError;
