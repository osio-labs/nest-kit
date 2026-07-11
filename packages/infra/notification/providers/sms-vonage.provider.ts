/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { SmsSendInput, ProviderResult } from '../notification.types.js';
import type { NotificationProvider } from '../notification.constants.js';

/**
 * Vonage (Nexmo) SMS notification provider.
 *
 * Uses the `@vonage/server-sdk` SDK to send SMS messages via Vonage's API.
 */
export class VonageSmsProvider implements NotificationProvider<SmsSendInput> {
  readonly name = 'vonage';

  readonly channel = 'sms';

  private readonly apiKey: string;

  private readonly apiSecret: string;

  private readonly from?: string;

  constructor(options: { apiKey: string; apiSecret: string; from?: string }) {
    this.apiKey = options.apiKey;
    this.apiSecret = options.apiSecret;
    this.from = options.from;
  }

  async send(input: SmsSendInput): Promise<ProviderResult> {
    try {
      const { Auth } = require('@vonage/auth');
      const { Vonage } = require('@vonage/server-sdk');

      const credentials = new Auth({
        apiKey: this.apiKey,
        apiSecret: this.apiSecret,
      });
      const vonage = new Vonage(credentials);

      const from = input.from ?? this.from ?? 'NestKit';

      const result = await vonage.sms.send({ to: input.to, from, text: input.body });

      return {
        success: true,
        providerName: this.name,
        channel: this.channel,
        messageId: result?.messages?.[0]?.['message-id'] as string | undefined,
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
