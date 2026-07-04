import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingWebhookAdapter, IncomingWebhookEvent } from '../../webhook.types';

/**
 * Slack webhook adapter.
 *
 * Parses Slack webhook payloads and verifies the HMAC signature
 * using Slack's versioned signature scheme (v0).
 */
@Injectable()
export class SlackWebhookAdapter implements IncomingWebhookAdapter {
  readonly source = 'slack';

  parse(
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): IncomingWebhookEvent {
    const payload =
      typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

    // Slack sends URL-encoded form data with a `payload` field for interactions
    const eventType = payload.type as string | undefined;
    const event = (payload.event as { type?: string })?.type ?? eventType ?? 'unknown';

    return {
      source: 'slack',
      headers,
      body,
      event,
      payload,
    };
  }

  verify(
    body: unknown,
    signature: string,
    secret: string,
    headers?: Record<string, string | string[] | undefined>,
  ): boolean {
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    const tsHeader = headers?.['x-slack-request-timestamp'];
    const timestamp = typeof tsHeader === 'string' ? tsHeader : '';

    const sigBase = `v0:${timestamp}:${rawBody}`;
    const hmac = createHmac('sha256', secret);
    hmac.update(sigBase);
    const expected = `v0=${hmac.digest('hex')}`;

    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }
}
