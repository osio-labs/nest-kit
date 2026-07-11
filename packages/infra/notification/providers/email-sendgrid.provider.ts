/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { EmailSendInput, ProviderResult } from '../notification.types.js';
import type { NotificationProvider } from '../notification.constants.js';

/**
 * SendGrid email notification provider.
 *
 * Uses the `@sendgrid/mail` SDK to send transactional emails.
 */
export class SendGridEmailProvider implements NotificationProvider<EmailSendInput> {
  readonly name = 'sendgrid';

  readonly channel = 'email';

  private readonly apiKey: string;

  private readonly defaultFrom?: string;

  private initialized = false;

  constructor(options: { apiKey: string; defaultFrom?: string }) {
    this.apiKey = options.apiKey;
    this.defaultFrom = options.defaultFrom;
  }

  async send(input: EmailSendInput): Promise<ProviderResult> {
    try {
      const sgMail = require('@sendgrid/mail');

      if (!this.initialized) {
        sgMail.setApiKey(this.apiKey);
        this.initialized = true;
      }

      const msg: Record<string, unknown> = {
        to: input.to,
        subject: input.subject,
        html: input.body,
      };

      if (input.text) msg.text = input.text;
      if (input.cc) msg.cc = input.cc;
      if (input.bcc) msg.bcc = input.bcc;
      if (input.from) msg.from = input.from;
      else if (this.defaultFrom) msg.from = this.defaultFrom;
      if (input.replyTo) msg.replyTo = input.replyTo;
      if (input.attachments) {
        msg.attachments = input.attachments.map((a) => ({
          filename: a.filename,
          content: a.content instanceof Buffer ? a.content.toString('base64') : a.content,
        }));
      }

      const [response] = await sgMail.send(msg);

      return {
        success: true,
        providerName: this.name,
        channel: this.channel,
        messageId: response?.headers?.['x-message-id'] as string | undefined,
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
