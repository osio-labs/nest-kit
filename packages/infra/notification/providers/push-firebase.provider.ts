/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { PushSendInput, ProviderResult } from '../notification.types';
import type { NotificationProvider } from '../notification.constants';

/**
 * Firebase Cloud Messaging push notification provider.
 *
 * Uses the `firebase-admin` SDK to send push notifications via FCM.
 */
export class FirebasePushProvider implements NotificationProvider<PushSendInput> {
  readonly name = 'firebase';

  readonly channel = 'push';

  private readonly serviceAccountPath?: string;

  private readonly serviceAccount?: object;

  private initialized = false;

  constructor(options: { serviceAccountPath?: string; serviceAccount?: object }) {
    this.serviceAccountPath = options.serviceAccountPath;
    this.serviceAccount = options.serviceAccount;

    if (!this.serviceAccountPath && !this.serviceAccount) {
      throw new Error('Either serviceAccountPath or serviceAccount must be provided');
    }
  }

  async send(input: PushSendInput): Promise<ProviderResult> {
    try {
      const admin = require('firebase-admin');

      if (!this.initialized) {
        if (admin.apps.length === 0) {
          if (this.serviceAccount) {
            admin.initializeApp({ credential: admin.credential.cert(this.serviceAccount) });
          } else if (this.serviceAccountPath) {
            const serviceAccount = require(this.serviceAccountPath);
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
          }
        }
        this.initialized = true;
      }

      const message: Record<string, unknown> = {
        tokens: input.tokens,
        notification: {
          title: input.title,
          body: input.body,
        },
      };

      if (input.data) message.data = input.data;
      if (input.image)
        message.notification = { ...(message.notification as object), image: input.image };

      const android: Record<string, unknown> = {};
      const apns: Record<string, unknown> = {};

      if (input.badge !== undefined) {
        apns.payload = { aps: { badge: input.badge } };
      }
      if (input.sound) {
        android.sound = input.sound;
        apns.payload = {
          ...(apns.payload || {}),
          aps: {
            ...(((apns.payload as Record<string, unknown>)?.aps as object) || {}),
            sound: input.sound,
          },
        };
      }

      if (Object.keys(android).length > 0) message.android = android;
      if (Object.keys(apns).length > 0) message.apns = apns;

      const response = await admin.messaging().sendEachForMulticast(message);

      const allSent = response.successCount === input.tokens.length;

      return {
        success: allSent,
        providerName: this.name,
        channel: this.channel,
        messageId: response?.responses?.[0]?.messageId as string | undefined,
        metadata: {
          successCount: response.successCount,
          failureCount: response.failureCount,
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
