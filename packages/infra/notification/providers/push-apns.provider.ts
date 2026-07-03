/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { PushSendInput, ProviderResult } from '../notification.types';
import type { NotificationProvider } from '../notification.constants';

/**
 * Apple Push Notification Service (APNs) provider.
 *
 * Uses the `@parse/node-apn` SDK to send push notifications to iOS devices.
 */
export class ApnsPushProvider implements NotificationProvider<PushSendInput> {
  readonly name = 'apns';

  readonly channel = 'push';

  private readonly key: string;

  private readonly keyId: string;

  private readonly teamId: string;

  private readonly bundleId: string;

  private readonly production: boolean;

  private initialized = false;

  constructor(options: {
    key: string;
    keyId: string;
    teamId: string;
    bundleId: string;
    production?: boolean;
  }) {
    this.key = options.key;
    this.keyId = options.keyId;
    this.teamId = options.teamId;
    this.bundleId = options.bundleId;
    this.production = options.production ?? false;
  }

  async send(input: PushSendInput): Promise<ProviderResult> {
    try {
      const apn = require('@parse/node-apn');

      if (!this.initialized) {
        this.initialized = true;
      }

      const provider = new apn.Provider({
        token: {
          key: this.key,
          keyId: this.keyId,
          teamId: this.teamId,
        },
        production: this.production,
      });

      const notification = new apn.Notification();

      notification.alert = { title: input.title, body: input.body };
      notification.topic = this.bundleId;

      if (input.badge !== undefined) notification.badge = input.badge;
      if (input.sound) notification.sound = input.sound;
      if (input.data) notification.payload = input.data;

      const result = await provider.send(notification, input.tokens);

      provider.shutdown();

      const allSent = result.sent.length === input.tokens.length;

      return {
        success: allSent,
        providerName: this.name,
        channel: this.channel,
        messageId: result.sent?.[0] as string | undefined,
        metadata: {
          sent: result.sent.length,
          failed: result.failed.length,
        },
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
