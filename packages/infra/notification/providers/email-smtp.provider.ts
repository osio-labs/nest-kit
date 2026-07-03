/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { EmailSendInput, ProviderResult } from '../notification.types';
import type { NotificationProvider } from '../notification.constants';

/**
 * Generic SMTP email notification provider.
 *
 * Uses `nodemailer` to send emails through a custom SMTP server.
 */
export class SmtpEmailProvider implements NotificationProvider<EmailSendInput> {
  readonly name = 'smtp';

  readonly channel = 'email';

  private readonly host: string;

  private readonly port: number;

  private readonly user?: string;

  private readonly pass?: string;

  private readonly secure: boolean;

  private readonly defaultFrom?: string;

  private transporter: any = null;

  constructor(options: {
    host: string;
    port: number;
    user?: string;
    pass?: string;
    secure?: boolean;
    defaultFrom?: string;
  }) {
    this.host = options.host;
    this.port = options.port;
    this.user = options.user;
    this.pass = options.pass;
    this.secure = options.secure ?? false;
    this.defaultFrom = options.defaultFrom;
  }

  private getTransporter(): any {
    if (!this.transporter) {
      const nodemailer = require('nodemailer');

      const auth: Record<string, string> | undefined =
        this.user && this.pass ? { user: this.user, pass: this.pass } : undefined;

      this.transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.secure,
        ...(auth ? { auth } : {}),
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
