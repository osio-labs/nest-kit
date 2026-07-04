import { Injectable } from '@nestjs/common';
import type { IncomingWebhookAdapter, IncomingWebhookEvent } from '../../webhook.types';
import { verifySignature } from '../../webhook.utils';

/**
 * GitLab webhook adapter.
 *
 * Parses GitLab webhook payloads and supports verification via
 * `x-gitlab-token` header or HMAC signature `x-hub-signature`.
 */
@Injectable()
export class GitLabWebhookAdapter implements IncomingWebhookAdapter {
  readonly source = 'gitlab';

  parse(
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): IncomingWebhookEvent {
    const event = Array.isArray(headers['x-gitlab-event'])
      ? headers['x-gitlab-event'][0]
      : (headers['x-gitlab-event'] ?? 'unknown');

    return {
      source: 'gitlab',
      headers,
      body,
      event,
      payload: body,
    };
  }

  verify(body: unknown, signature: string, secret: string): boolean {
    return verifySignature(JSON.stringify(body), signature, secret, 'sha256');
  }
}
