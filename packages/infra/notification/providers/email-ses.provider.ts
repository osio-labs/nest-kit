/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { EmailSendInput, ProviderResult } from '../notification.types';
import type { NotificationProvider } from '../notification.constants';

/**
 * AWS SES email notification provider.
 *
 * Uses the `@aws-sdk/client-ses` SDK to send emails via Amazon Simple Email Service.
 */
export class SesEmailProvider implements NotificationProvider<EmailSendInput> {
  readonly name = 'ses';

  readonly channel = 'email';

  private readonly region: string;

  private readonly accessKeyId: string;

  private readonly secretAccessKey: string;

  private readonly defaultFrom?: string;

  private sesClient: any = null;

  constructor(options: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    defaultFrom?: string;
  }) {
    this.region = options.region;
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;
    this.defaultFrom = options.defaultFrom;
  }

  private getClient(): any {
    if (!this.sesClient) {
      const { SES } = require('@aws-sdk/client-ses');
      this.sesClient = new SES({
        region: this.region,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });
    }
    return this.sesClient;
  }

  async send(input: EmailSendInput): Promise<ProviderResult> {
    try {
      const client = this.getClient();
      const from = input.from ?? this.defaultFrom;

      const destinations = {
        ToAddresses: Array.isArray(input.to) ? input.to : [input.to],
      } as Record<string, unknown>;

      if (input.cc) destinations.CcAddresses = input.cc;
      if (input.bcc) destinations.BccAddresses = input.bcc;

      const message: Record<string, unknown> = {
        Subject: { Data: input.subject },
        Body: {
          Html: { Data: input.body },
        },
      };

      if (input.text) {
        (message.Body as Record<string, unknown>).Text = { Data: input.text };
      }

      const params: Record<string, unknown> = {
        Source: from,
        Destination: destinations,
        Message: message,
      };

      if (input.replyTo) params.ReplyToAddresses = [input.replyTo];

      if (input.attachments) {
        params.RawMessage = {
          Data: input.body,
        };
      }

      const result = await client.send(
        new (require('@aws-sdk/client-ses').SendEmailCommand)(params),
      );

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
