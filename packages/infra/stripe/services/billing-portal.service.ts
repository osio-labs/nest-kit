import { Inject, Injectable } from '@nestjs/common';
import type { Stripe } from 'stripe';
import { STRIPE_CLIENT } from '../stripe.constants.js';
import type { CreateBillingPortalOptions } from '../stripe.types.js';

/**
 * Service for Stripe Billing Portal (Customer Portal).
 *
 * Creates sessions that redirect customers to manage their subscriptions
 * and billing details.
 */
@Injectable()
export class BillingPortalService {
  constructor(
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
  ) {}

  /**
   * Create a billing portal session.
   */
  async create(options: CreateBillingPortalOptions): Promise<Stripe.BillingPortal.Session> {
    return this.stripe.billingPortal.sessions.create(
      {
        customer: options.customer,
        return_url: options.returnUrl,
      },
      { idempotencyKey: options.idempotencyKey },
    );
  }
}
