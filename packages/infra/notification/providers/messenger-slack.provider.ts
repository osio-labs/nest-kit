/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { SlackSendInput, ProviderResult } from '../notification.types.js';
import type { NotificationProvider } from '../notification.constants.js';

/**
 * Slack notification provider.
 *
 * Uses the `@slack/web-api` SDK to send messages to Slack channels.
 */
export class SlackProvider implements NotificationProvider<SlackSendInput> {
  readonly name = 'slack';

  readonly channel = 'slack';

  private readonly botToken?: string;

  private readonly webhookUrl?: string;

  private client: unknown = null;

  constructor(options: { botToken?: string; webhookUrl?: string }) {
    this.botToken = options.botToken;
    this.webhookUrl = options.webhookUrl;

    if (!this.botToken && !this.webhookUrl) {
      throw new Error('Either botToken or webhookUrl must be provided');
    }
  }

  async send(input: SlackSendInput): Promise<ProviderResult> {
    try {
      if (this.webhookUrl) {
        const { IncomingWebhook } = require('@slack/webhook');

        const webhook = new IncomingWebhook(this.webhookUrl);

        const webhookResult = await webhook.send({
          text: input.text,
          blocks: input.blocks as Record<string, unknown>[],
          attachments: input.attachments as Record<string, unknown>[],
        });

        return {
          success: true,
          providerName: this.name,
          channel: this.channel,
          messageId: webhookResult?.text as string | undefined,
        };
      }

      const { WebClient } = require('@slack/web-api');

      if (!this.client) {
        this.client = new WebClient(this.botToken);
      }

      const result = await (this.client as any).chat.postMessage({
        channel: input.channel,
        text: input.text,
        blocks: input.blocks,
        attachments: input.attachments,
        thread_ts: input.threadTs,
      });

      return {
        success: true,
        providerName: this.name,
        channel: this.channel,
        messageId: (result as Record<string, unknown>).ts as string | undefined,
      };
    } catch (error: unknown) {
      return {
        success: false,
        providerName: this.name,
        channel: this.channel,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
