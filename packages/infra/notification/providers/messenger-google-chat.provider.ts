import type { GoogleChatSendInput, ProviderResult } from '../notification.types';
import type { NotificationProvider } from '../notification.constants';

/**
 * Google Chat notification provider.
 *
 * Sends messages to a Google Chat space via incoming webhook.
 * Supports simple text messages and interactive cards.
 *
 * No additional dependencies required — uses the built-in `fetch` API.
 *
 * @see https://developers.google.com/chat/how-tos/webhooks
 */
export class GoogleChatProvider implements NotificationProvider<GoogleChatSendInput> {
  readonly name = 'googlechat';

  readonly channel = 'googlechat';

  async send(input: GoogleChatSendInput): Promise<ProviderResult> {
    try {
      const body: Record<string, unknown> = { text: input.text };

      if (input.threadKey) {
        body.thread = { threadKey: input.threadKey };
      }

      if (input.cards?.length) {
        body.cardsV2 = input.cards.map((card, i) => ({
          cardId: `card-${i}`,
          card: {
            header: card.header,
            sections: card.sections?.map((s) => ({
              header: s.header,
              widgets: s.widgets,
            })),
          },
        }));
      }

      const response = await fetch(input.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        return {
          success: false,
          providerName: this.name,
          channel: this.channel,
          error: `Google Chat webhook responded with ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        providerName: this.name,
        channel: this.channel,
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
