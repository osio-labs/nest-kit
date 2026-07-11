import { Inject, Injectable } from '@nestjs/common';
import type { Stripe } from 'stripe';
import { STRIPE_CLIENT } from '../stripe.constants.js';
import type { CreateCustomerOptions } from '../stripe.types.js';

/**
 * Service for Stripe Customers operations.
 *
 * Provides methods to create and retrieve customers.
 */
@Injectable()
export class CustomersService {
  constructor(
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
  ) {}

  /**
   * Create a new customer.
   */
  async create(options: CreateCustomerOptions): Promise<Stripe.Customer> {
    const payload: Stripe.CustomerCreateParams = {
      email: options.email,
      name: options.name,
      phone: options.phone,
      description: options.description,
      metadata: options.metadata,
      payment_method: options.paymentMethod,
    };

    return this.stripe.customers.create(payload, {
      idempotencyKey: options.idempotencyKey,
    });
  }

  /**
   * Retrieve a customer by their Stripe ID.
   */
  async retrieve(id: string): Promise<Stripe.Customer> {
    return this.stripe.customers.retrieve(id) as Promise<Stripe.Customer>;
  }
}
