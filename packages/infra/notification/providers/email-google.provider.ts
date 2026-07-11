/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { EmailSendInput, ProviderResult } from '../notification.types.js';
import type { NotificationProvider } from '../notification.constants.js';

/**
 * Google SMTP / Gmail email notification provider.
 *
 * Uses `nodemailer` with `service: 'gmail'` to send emails via Google's SMTP.
 */
export class GoogleEmailProvider implements NotificationProvider<EmailSendInput> {
  readonly name = 'google';

  readonly channel = 'email';

  private readonly user: string;

  private readonly pass: string;

  private readonly defaultFrom?: string;

  private transporter: any = null;

  constructor(options: { user: string; pass: string; defaultFrom?: string }) {
    this.user = options.user;
    this.pass = options.pass;
    this.defaultFrom = options.defaultFrom;
  }

  private getTransporter(): any {
    if (!this.transporter) {
      const nodemailer = require('nodemailer');
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: this.user, pass: this.pass },
      });
    }
    return this.transporter;
  }

  async send(input: EmailSendInput): Promise<ProviderResult> {
    try {
      const transporter = this.getTransporter();

      const mailOptions: Record<string, unknown> = {
        to: Array.isArray(input.to) ? input.to.join(', ') : input.to,
        subject: input.subject,
        html: input.body,
      };

      if (input.text) mailOptions.text = input.text;
      if (input.cc) mailOptions.cc = input.cc.join(', ');
      if (input.bcc) mailOptions.bcc = input.bcc.join(', ');
      if (input.from) mailOptions.from = input.from;
      else if (this.defaultFrom) mailOptions.from = this.defaultFrom;
      if (input.replyTo) mailOptions.replyTo = input.replyTo;
      if (input.attachments) {
        mailOptions.attachments = input.attachments;
      }

      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        providerName: this.name,
        channel: this.channel,
        messageId: info.messageId as string | undefined,
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
