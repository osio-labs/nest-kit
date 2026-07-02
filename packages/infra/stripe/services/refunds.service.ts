import { Inject, Injectable } from '@nestjs/common';
import type { Stripe } from 'stripe';
import { STRIPE_CLIENT, PAYMENT_STORE } from '../stripe.constants';
import type { CreateRefundOptions, PaymentStore } from '../stripe.types';

/**
 * Service for Stripe Refunds operations.
 *
 * Provides methods to create (full & partial), list, retrieve, and cancel refunds.
 * When a `PaymentStore` is active, refund records are persisted.
 */
@Injectable()
export class RefundsService {
  constructor(
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
    @Inject(PAYMENT_STORE)
    private readonly store: PaymentStore | null,
  ) {}

  /**
   * Create a refund (full or partial).
   */
  async create(options: CreateRefundOptions): Promise<Stripe.Refund> {
    const payload: Stripe.RefundCreateParams = {
      payment_intent: options.paymentIntent,
      amount: options.amount,
      reason: options.reason,
      metadata: options.metadata,
    };

    const refund = await this.stripe.refunds.create(payload, {
      idempotencyKey: options.idempotencyKey,
    });

    if (this.store) {
      await this.store.createRefund({
        id: refund.id,
        stripeId: refund.id,
        paymentIntentId: options.paymentIntent,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status ?? 'pending',
        reason: options.reason,
        metadata: options.metadata,
      });
    }

    return refund;
  }

  /**
   * Retrieve a refund by its Stripe ID.
   */
  async retrieve(id: string): Promise<Stripe.Refund> {
    return this.stripe.refunds.retrieve(id);
  }

  /**
   * List refunds with an optional limit.
   */
  async list(limit?: number): Promise<Stripe.Refund[]> {
    const response = await this.stripe.refunds.list({ limit: limit ?? 10 });
    return response.data;
  }

  /**
   * Cancel a refund (only available for pending refunds).
   */
  async cancel(id: string, idempotencyKey?: string): Promise<Stripe.Refund> {
    const refund = await this.stripe.refunds.cancel(id, {
      idempotencyKey,
    });

    if (this.store) {
      await this.store.updateRefundStatus(id, refund.status ?? 'pending');
    }

    return refund;
  }
}
