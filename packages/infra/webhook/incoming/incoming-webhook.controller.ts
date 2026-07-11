import { Controller, Post, Req, Headers, Logger, Inject, Optional, HttpCode } from '@nestjs/common';
import type { IncomingWebhookAdapter, IncomingWebhookHandler } from '../webhook.types.js';
import { INCOMING_WEBHOOK_ADAPTERS, INCOMING_WEBHOOK_HANDLERS } from '../webhook.constants.js';
import { IncomingWebhookService } from './incoming-webhook.service.js';

/**
 * Auto-registered controller that receives incoming webhooks
 * and dispatches them to registered adapters and handlers.
 *
 * Supports signature verification, adapter-based parsing,
 * and multiple source integrations.
 */
@Controller()
export class IncomingWebhookController {
  private readonly logger = new Logger(IncomingWebhookController.name);

  constructor(
    private readonly incomingService: IncomingWebhookService,
    @Optional()
    @Inject(INCOMING_WEBHOOK_ADAPTERS)
    private readonly adapters: IncomingWebhookAdapter[] = [],
    @Optional()
    @Inject(INCOMING_WEBHOOK_HANDLERS)
    private readonly handlers: IncomingWebhookHandler[] = [],
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: any,
    @Headers('x-webhook-source') sourceHeader?: string,
  ): Promise<{ received: boolean }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const body = req.body as unknown;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const headers = req.headers as Record<string, string | string[] | undefined>;

    const source = sourceHeader ?? this.detectSource(headers);
    if (!source) {
      this.logger.warn('Received webhook with no detectable source');
      return { received: true };
    }

    const adapter = this.adapters.find((a) => a.source === source);
    if (!adapter) {
      this.logger.warn(`No adapter found for webhook source "${source}"`);
      return { received: true };
    }

    const verified = await this.incomingService.verify(adapter, body, headers);
    if (!verified) {
      this.logger.warn(`Webhook signature verification failed for source "${source}"`);
      return { received: true };
    }

    const event = adapter.parse(body, headers);
    this.logger.log(`Webhook received from "${source}"`);

    const eventWithSource = { ...event, source };

    await Promise.allSettled(
      this.handlers.map((handler) => Promise.resolve(handler(eventWithSource))),
    ).then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') {
          this.logger.error(
            `Webhook handler failed for "${source}": ${(result.reason as Error).message}`,
          );
        }
      }
    });

    return { received: true };
  }

  private detectSource(headers: Record<string, string | string[] | undefined>): string | null {
    const ua = typeof headers['user-agent'] === 'string' ? headers['user-agent'] : '';
    if (ua.includes('GitHub-Hookshot')) return 'github';
    if (ua.includes('GitLab')) return 'gitlab';
    if (ua.includes('Stripe')) return 'stripe';
    if (ua.includes('Sentry')) return 'sentry';
    if (ua.includes('Slack')) return 'slack';

    const sourceHeader = headers['x-webhook-source'];
    if (typeof sourceHeader === 'string') return sourceHeader;

    return null;
  }
}
