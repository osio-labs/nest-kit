import { Inject, Injectable } from '@nestjs/common';
import type { Stripe } from 'stripe';
import { STRIPE_CLIENT } from '../stripe.constants.js';
import type { CreateSubscriptionOptions, UpdateSubscriptionOptions } from '../stripe.types.js';

/**
 * Service for Stripe Subscriptions operations.
 *
 * Provides methods to create, update, cancel, retrieve, and list subscriptions.
 */
@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
  ) {}

  /**
   * Create a new subscription.
   */
  async create(options: CreateSubscriptionOptions): Promise<Stripe.Subscription> {
    const payload: Stripe.SubscriptionCreateParams = {
      customer: options.customer,
      items: options.items.map((item) => ({
        price: item.price,
        quantity: item.quantity,
      })),
      payment_behavior: options.paymentBehavior,
      metadata: options.metadata,
      trial_period_days: options.trialPeriodDays,
      cancel_at_period_end: options.cancelAtPeriodEnd,
    };

    return this.stripe.subscriptions.create(payload, {
      idempotencyKey: options.idempotencyKey,
    });
  }

  /**
   * Update a subscription.
   */
  async update(id: string, options: UpdateSubscriptionOptions): Promise<Stripe.Subscription> {
    const payload: Stripe.SubscriptionUpdateParams = {
      items: options.items?.map((item) => ({
        price: item.price,
        quantity: item.quantity,
      })),
      metadata: options.metadata,
      cancel_at_period_end: options.cancelAtPeriodEnd,
    };

    return this.stripe.subscriptions.update(id, payload, {
      idempotencyKey: options.idempotencyKey,
    });
  }

  /**
   * Cancel a subscription at the end of the current period.
   */
  async cancel(
    id: string,
    options?: { cancelAtPeriodEnd?: boolean; idempotencyKey?: string },
  ): Promise<Stripe.Subscription> {
    if (options?.cancelAtPeriodEnd === false) {
      // Cancel immediately
      return this.stripe.subscriptions.cancel(id, {
        idempotencyKey: options.idempotencyKey,
      });
    }
    // Set `cancel_at_period_end` to true
    return this.stripe.subscriptions.update(id, {
      cancel_at_period_end: true,
    });
  }

  /**
   * Retrieve a subscription by its Stripe ID.
   */
  async retrieve(id: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(id);
  }

  /**
   * List subscriptions with an optional limit.
   */
  async list(limit?: number): Promise<Stripe.Subscription[]> {
    const response = await this.stripe.subscriptions.list({ limit: limit ?? 10 });
    return response.data;
  }
}
