/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { EmailSendInput, ProviderResult } from '../notification.types';
import type { NotificationProvider } from '../notification.constants';

/**
 * Mailgun email notification provider.
 *
 * Sends emails via the Mailgun HTTP API using `form-data` and `https`.
 */
export class MailgunEmailProvider implements NotificationProvider<EmailSendInput> {
  readonly name = 'mailgun';

  readonly channel = 'email';

  private readonly apiKey: string;

  private readonly domain: string;

  private readonly defaultFrom?: string;

  constructor(options: { apiKey: string; domain: string; defaultFrom?: string }) {
    this.apiKey = options.apiKey;
    this.domain = options.domain;
    this.defaultFrom = options.defaultFrom;
  }

  async send(input: EmailSendInput): Promise<ProviderResult> {
    try {
      const formData = require('form-data');
      const https = require('https');

      const form = new formData();
      const recipients = Array.isArray(input.to) ? input.to.join(', ') : input.to;

      form.append('from', input.from ?? this.defaultFrom ?? `noreply@${this.domain}`);
      form.append('to', recipients);
      form.append('subject', input.subject);
      form.append('html', input.body);

      if (input.text) form.append('text', input.text);
      if (input.cc) form.append('cc', input.cc.join(', '));
      if (input.bcc) form.append('bcc', input.bcc.join(', '));
      if (input.replyTo) form.append('h:Reply-To', input.replyTo);
      if (input.attachments) {
        for (const attachment of input.attachments) {
          form.append('attachment', attachment.content, { filename: attachment.filename });
        }
      }

      const auth = Buffer.from(`api:${this.apiKey}`).toString('base64');

      await new Promise<void>((resolve, reject) => {
        const request = https.request(
          {
            method: 'POST',
            hostname: 'api.mailgun.net',
            path: `/v3/${this.domain}/messages`,
            headers: {
              ...form.getHeaders(),
              Authorization: `Basic ${auth}`,
            },
          },
          (res: {
            statusCode: number;
            on: (event: string, cb: (chunk?: string) => void) => void;
          }) => {
            let body = '';
            res.on('data', (chunk: string | undefined) => {
              body += chunk;
            });
            res.on('end', () => {
              if (res.statusCode != null && res.statusCode >= 200 && res.statusCode < 300) {
                resolve();
              } else {
                reject(new Error(`Mailgun API error ${res.statusCode ?? 'unknown'}: ${body}`));
              }
            });
          },
        );

        request.on('error', reject);
        form.pipe(request);
      });

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
