/** Injection token for the Stripe module options. */
export const STRIPE_MODULE_OPTIONS = 'STRIPE_MODULE_OPTIONS';

/** Injection token for the raw Stripe SDK client. */
export const STRIPE_CLIENT = 'STRIPE_CLIENT';

/** Injection token for the `PaymentStore` implementation. */
export const PAYMENT_STORE = 'PAYMENT_STORE';

/** Injection token for webhook handler registration. */
export const STRIPE_WEBHOOK_HANDLERS = 'STRIPE_WEBHOOK_HANDLERS';

/** Injection token for idempotency key cache. */
export const IDEMPOTENCY_CACHE = 'IDEMPOTENCY_CACHE';

/** Default idempotency key TTL in milliseconds (1 hour). */
export const DEFAULT_IDEMPOTENCY_TTL = 3600000;

/** Default currency. */
export const DEFAULT_CURRENCY = 'usd';
