import type { PaymentIntentStatus } from '../stripe.types.js';

/**
 * Legal payment-intent status transitions.
 *
 * Maps each status to the set of statuses it can transition **to**.
 * An empty array means the status is terminal.
 */
export const VALID_TRANSITIONS: Record<PaymentIntentStatus, PaymentIntentStatus[]> = {
  requires_payment_method: ['requires_confirmation', 'requires_action', 'processing', 'canceled'],
  requires_confirmation: ['requires_action', 'processing', 'succeeded', 'failed', 'canceled'],
  requires_action: ['processing', 'succeeded', 'failed', 'canceled'],
  processing: ['succeeded', 'failed', 'requires_payment_method', 'canceled'],
  succeeded: [],
  failed: [],
  canceled: [],
};

/** Statuses considered terminal (no outgoing transitions). */
export const PAYMENT_INTENT_FINAL_STATUSES: PaymentIntentStatus[] = [
  'succeeded',
  'failed',
  'canceled',
];

/**
 * Check whether a transition from `current` to `next` is legal.
 *
 * @throws {Error} If the transition is not allowed.
 */
export function assertValidTransition(
  current: PaymentIntentStatus,
  next: PaymentIntentStatus,
): void {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed) {
    throw new Error(`Unknown payment intent status: "${current}"`);
  }
  if (!allowed.includes(next)) {
    throw new Error(
      `Invalid payment intent transition: "${current}" → "${next}". ` +
        `Allowed transitions: ${allowed.map((s) => `"${s}"`).join(', ') || '(none)'}`,
    );
  }
}
