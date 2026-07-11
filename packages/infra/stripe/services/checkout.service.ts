import { Inject, Injectable } from '@nestjs/common';
import type { Stripe } from 'stripe';
import { STRIPE_CLIENT } from '../stripe.constants.js';
import type { CreateCheckoutSessionOptions } from '../stripe.types.js';

/**
 * Service for Stripe Checkout Sessions.
 *
 * Creates hosted checkout pages for one-time payments or subscriptions.
 */
@Injectable()
export class CheckoutService {
  constructor(
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
  ) {}

  /**
   * Create a new checkout session.
   */
  async create(options: CreateCheckoutSessionOptions): Promise<Stripe.Checkout.Session> {
    const payload: Stripe.Checkout.SessionCreateParams = {
      customer: options.customer,
      mode: options.mode,
      line_items: options.lineItems.map((item) => ({
        price: item.price,
        quantity: item.quantity,
      })),
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: options.metadata,
      allow_promotion_codes: options.allowPromotionCodes,
      customer_email: options.customerEmail,
    };

    return this.stripe.checkout.sessions.create(payload, {
      idempotencyKey: options.idempotencyKey,
    });
  }

  /**
   * Retrieve a checkout session by its Stripe ID.
   */
  async retrieve(id: string): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(id);
  }
}
