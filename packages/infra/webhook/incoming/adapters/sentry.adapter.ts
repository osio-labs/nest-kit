import { Injectable } from '@nestjs/common';
import type { IncomingWebhookAdapter, IncomingWebhookEvent } from '../../webhook.types.js';
import { verifySignature } from '../../webhook.utils.js';

/**
 * Sentry webhook adapter.
 *
 * Parses Sentry webhook payloads and verifies the HMAC signature
 * using the `sentry-hook-signature` header.
 */
@Injectable()
export class SentryWebhookAdapter implements IncomingWebhookAdapter {
  readonly source = 'sentry';

  parse(
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): IncomingWebhookEvent {
    const payload =
      typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
    const action = payload.action as string | undefined;

    return {
      source: 'sentry',
      headers,
      body,
      event: (payload.event as string) ?? action ?? 'unknown',
      payload,
    };
  }

  verify(body: unknown, signature: string, secret: string): boolean {
    return verifySignature(JSON.stringify(body), signature, secret, 'sha256');
  }
}
