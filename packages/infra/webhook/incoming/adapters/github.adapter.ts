import { Injectable } from '@nestjs/common';
import type { IncomingWebhookAdapter, IncomingWebhookEvent } from '../../webhook.types.js';
import { verifySignature, parseSignatureHeader } from '../../webhook.utils.js';

/**
 * GitHub webhook adapter.
 *
 * Parses GitHub webhook payloads and verifies HMAC signatures
 * using the `x-hub-signature-256` header.
 */
@Injectable()
export class GitHubWebhookAdapter implements IncomingWebhookAdapter {
  readonly source = 'github';

  parse(
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): IncomingWebhookEvent {
    const event = Array.isArray(headers['x-github-event'])
      ? headers['x-github-event'][0]
      : (headers['x-github-event'] ?? 'unknown');

    const delivery = Array.isArray(headers['x-github-delivery'])
      ? headers['x-github-delivery'][0]
      : headers['x-github-delivery'];

    return {
      source: 'github',
      headers,
      body,
      event,
      payload: {
        event,
        delivery,
        action:
          typeof body === 'object' && body !== null
            ? (body as Record<string, unknown>).action
            : undefined,
        ...(typeof body === 'object' && body !== null ? body : {}),
      },
    };
  }

  verify(body: unknown, signature: string, secret: string): boolean {
    const parsed = parseSignatureHeader(signature);
    if (!parsed) return false;

    return verifySignature(JSON.stringify(body), parsed.signature, secret, parsed.algorithm);
  }
}
