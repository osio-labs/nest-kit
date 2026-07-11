import { Injectable, Logger, Inject } from '@nestjs/common';
import type {
  IncomingWebhookAdapter,
  IncomingWebhookEvent,
  IncomingWebhookModuleOptions,
} from '../webhook.types.js';
import { INCOMING_WEBHOOK_OPTIONS } from '../webhook.constants.js';
import { verifySignature, parseSignatureHeader } from '../webhook.utils.js';
import { WebhookEventBus } from '../event-bus.js';

/**
 * Service for processing incoming webhooks.
 *
 * Handles signature verification using registered adapters
 * and dispatches parsed events to the event bus.
 */
@Injectable()
export class IncomingWebhookService {
  private readonly logger = new Logger(IncomingWebhookService.name);

  constructor(
    @Inject(INCOMING_WEBHOOK_OPTIONS)
    private readonly options: IncomingWebhookModuleOptions,
    private readonly eventBus: WebhookEventBus,
  ) {}

  /**
   * Verify the HMAC signature of an incoming webhook request.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async verify(
    adapter: IncomingWebhookAdapter,
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<boolean> {
    if (adapter.verify) {
      const signature = this.extractSignature(headers, adapter.source);
      if (!signature) return !this.options.secret && !adapter.verify;

      return adapter.verify(body, signature, this.options.secret ?? '', headers);
    }

    if (!this.options.secret) return true;

    const signature = this.extractSignature(headers, adapter.source);
    if (!signature) return false;

    const parsed = parseSignatureHeader(signature);
    if (!parsed) {
      return verifySignature(
        JSON.stringify(body),
        signature,
        this.options.secret,
        this.options.algorithm,
      );
    }

    return verifySignature(
      JSON.stringify(body),
      parsed.signature,
      this.options.secret,
      parsed.algorithm,
    );
  }

  /**
   * Process a webhook event: verify, parse, and emit.
   */
  async process(
    adapter: IncomingWebhookAdapter,
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<IncomingWebhookEvent | null> {
    const verified = await this.verify(adapter, body, headers);
    if (!verified) {
      this.logger.warn(`Signature verification failed for adapter "${adapter.source}"`);
      return null;
    }

    const event = adapter.parse(body, headers);
    await this.eventBus.emit(`webhook:incoming:${adapter.source}`, event);
    await this.eventBus.emit('webhook:incoming', event);

    return event;
  }

  private extractSignature(
    headers: Record<string, string | string[] | undefined>,
    source: string,
  ): string | null {
    const candidateHeaders: string[] = [];

    switch (source) {
      case 'github':
        candidateHeaders.push('x-hub-signature-256', 'x-hub-signature');
        break;
      case 'gitlab':
        candidateHeaders.push('x-gitlab-token', 'x-hub-signature');
        break;
      case 'stripe':
        candidateHeaders.push('stripe-signature');
        break;
      case 'sentry':
        candidateHeaders.push('sentry-hook-signature');
        break;
      case 'slack':
        candidateHeaders.push('x-slack-signature', 'x-slack-request-timestamp');
        break;
      default:
        candidateHeaders.push('x-webhook-signature', 'x-hub-signature-256', 'x-hub-signature');
    }

    for (const header of candidateHeaders) {
      const value = headers[header];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }

    return null;
  }
}
