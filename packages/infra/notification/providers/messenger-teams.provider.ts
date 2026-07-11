import type { TeamsSendInput, ProviderResult } from '../notification.types.js';
import type { NotificationProvider } from '../notification.constants.js';

/**
 * Microsoft Teams notification provider.
 *
 * Sends messages via Teams incoming webhooks using the
 * [MessageCard](https://learn.microsoft.com/en-us/outlook/actionable-messages/message-card-reference)
 * or Adaptive Card format.
 *
 * Requires the `axios` package or uses built-in `https`/`fetch`.
 */
export class TeamsProvider implements NotificationProvider<TeamsSendInput> {
  readonly name = 'teams';

  readonly channel = 'teams';

  async send(input: TeamsSendInput): Promise<ProviderResult> {
    try {
      const body = {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        title: input.title,
        text: input.text,
        summary: input.summary ?? input.text,
        themeColor: input.themeColor ?? '0078D4',
        sections: input.sections,
      };

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
          error: `Teams webhook responded with ${response.status}: ${response.statusText}`,
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
