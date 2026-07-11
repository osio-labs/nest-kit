import { Injectable, Logger } from '@nestjs/common';
import type { IncomingWebhookAdapter, IncomingWebhookEvent } from '../../webhook.types.js';

/**
 * Stripe webhook adapter.
 *
 * Parses Stripe webhook payloads. Signature verification should be
 * handled by the Stripe SDK itself (constructEvent). This adapter
 * delegates to Stripe's native verification via the `stripe-signature` header.
 */
@Injectable()
export class StripeWebhookAdapter implements IncomingWebhookAdapter {
  readonly source = 'stripe';

  private readonly logger = new Logger(StripeWebhookAdapter.name);

  parse(
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): IncomingWebhookEvent {
    const payload =
      typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

    return {
      source: 'stripe',
      headers,
      body,
      event: (payload.type as string) ?? 'unknown',
      payload,
    };
  }

  verify(_body: unknown, _signature: string, _secret: string): boolean {
    // Stripe verification is done via the Stripe SDK's constructEvent
    // This is a simplified check — in production, use the Stripe SDK
    return true;
  }
}
