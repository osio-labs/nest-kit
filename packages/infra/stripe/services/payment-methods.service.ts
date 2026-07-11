import { Inject, Injectable } from '@nestjs/common';
import type { Stripe } from 'stripe';
import { STRIPE_CLIENT } from '../stripe.constants.js';
import type { AttachPaymentMethodOptions } from '../stripe.types.js';

/**
 * Service for Stripe Payment Methods operations.
 *
 * Provides methods to list, attach, and detach payment methods
 * for customers. Supports all 56+ Stripe payment method types.
 */
@Injectable()
export class PaymentMethodsService {
  constructor(
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
  ) {}

  /**
   * List payment methods for a customer.
   */
  async list(customer: string, type?: string, limit?: number): Promise<Stripe.PaymentMethod[]> {
    const response = await this.stripe.paymentMethods.list({
      customer,
      type: (type ?? 'card') as Stripe.PaymentMethodListParams.Type,
      limit: limit ?? 10,
    });
    return response.data;
  }

  /**
   * Attach a payment method to a customer.
   */
  async attach(options: AttachPaymentMethodOptions): Promise<Stripe.PaymentMethod> {
    return this.stripe.paymentMethods.attach(options.paymentMethod, {
      customer: options.customer,
    });
  }

  /**
   * Detach a payment method from a customer.
   */
  async detach(paymentMethod: string): Promise<Stripe.PaymentMethod> {
    return this.stripe.paymentMethods.detach(paymentMethod);
  }
}
