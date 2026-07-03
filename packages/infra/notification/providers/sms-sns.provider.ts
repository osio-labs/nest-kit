/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { SmsSendInput, ProviderResult } from '../notification.types';
import type { NotificationProvider } from '../notification.constants';

/**
 * AWS SNS SMS notification provider.
 *
 * Uses the `@aws-sdk/client-sns` SDK to send SMS messages via AWS SNS.
 */
export class SnsSmsProvider implements NotificationProvider<SmsSendInput> {
  readonly name = 'sns';

  readonly channel = 'sms';

  private readonly region: string;

  private readonly accessKeyId: string;

  private readonly secretAccessKey: string;

  private readonly from?: string;

  constructor(options: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    from?: string;
  }) {
    this.region = options.region;
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;
    this.from = options.from;
  }

  async send(input: SmsSendInput): Promise<ProviderResult> {
    try {
      const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

      const client = new SNSClient({
        region: this.region,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });

      const messageAttributes: Record<string, unknown> = {};

      const senderId = input.from ?? this.from;
      if (senderId) {
        messageAttributes['AWS.SNS.SMS.SenderID'] = {
          DataType: 'String',
          StringValue: senderId,
        };
      }

      const command = new PublishCommand({
        PhoneNumber: input.to,
        Message: input.body,
        MessageAttributes: messageAttributes,
      });

      const result = await client.send(command);

      return {
        success: true,
        providerName: this.name,
        channel: this.channel,
        messageId: result.MessageId as string | undefined,
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
