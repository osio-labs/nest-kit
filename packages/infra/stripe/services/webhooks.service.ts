import { Inject, Injectable } from '@nestjs/common';
import type { Stripe } from 'stripe';
import { STRIPE_CLIENT, STRIPE_MODULE_OPTIONS } from '../stripe.constants';
import type { StripeModuleOptions, StripeEventPayload } from '../stripe.types';

/**
 * Service for Stripe Webhooks.
 *
 * Constructs and validates webhook events from raw request payloads,
 * and provides typed event dispatch.
 */
@Injectable()
export class WebhooksService {
  constructor(
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
    @Inject(STRIPE_MODULE_OPTIONS)
    private readonly options: StripeModuleOptions,
  ) {}

  /**
   * Construct a Stripe event from a raw request body and signature header.
   *
   * Validates the signature using the configured `webhookSecret`.
   *
   * @param body     Raw request body (string or Buffer).
   * @param sigHeader The `stripe-signature` header value.
   * @returns The parsed and validated `Stripe.Event`.
   * @throws If the signature is invalid or no `webhookSecret` is configured.
   */
  constructEvent(body: string | Buffer, sigHeader: string): Stripe.Event {
    if (!this.options.webhookSecret) {
      throw new Error(
        'Stripe webhook secret is not configured. Set `webhookSecret` in StripeModule options.',
      );
    }
    return this.stripe.webhooks.constructEvent(body, sigHeader, this.options.webhookSecret);
  }

  /**
   * Cast a raw `Stripe.Event` to a typed `StripeEventPayload`.
   *
   * Useful for type-safe webhook handlers after constructing the event.
   */
  toPayload<T = unknown>(event: Stripe.Event): StripeEventPayload<T> {
    return {
      type: event.type,
      data: event.data.object as T,
      raw: event,
    };
  }
}
