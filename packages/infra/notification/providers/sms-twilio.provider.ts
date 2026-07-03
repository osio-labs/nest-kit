/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { SmsSendInput, ProviderResult } from '../notification.types';
import type { NotificationProvider } from '../notification.constants';

/**
 * Twilio SMS notification provider.
 *
 * Uses the `twilio` SDK to send SMS messages via Twilio's API.
 */
export class TwilioSmsProvider implements NotificationProvider<SmsSendInput> {
  readonly name = 'twilio';

  readonly channel = 'sms';

  private readonly accountSid: string;

  private readonly authToken: string;

  private readonly from?: string;

  constructor(options: { accountSid: string; authToken: string; from?: string }) {
    this.accountSid = options.accountSid;
    this.authToken = options.authToken;
    this.from = options.from;
  }

  async send(input: SmsSendInput): Promise<ProviderResult> {
    try {
      const twilio = require('twilio');
      const client = twilio(this.accountSid, this.authToken);

      const message: Record<string, string> = {
        to: input.to,
        body: input.body,
      };

      message.from = input.from ?? this.from ?? '';

      const result = await client.messages.create(message);

      return {
        success: true,
        providerName: this.name,
        channel: this.channel,
        messageId: result.sid as string,
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
