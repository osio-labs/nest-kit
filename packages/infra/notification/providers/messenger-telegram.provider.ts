/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

import type { TelegramSendInput, ProviderResult } from '../notification.types.js';
import type { NotificationProvider } from '../notification.constants.js';

/**
 * Telegram bot notification provider.
 *
 * Uses the `node-telegram-bot-api` library to send messages via a Telegram bot.
 */
export class TelegramProvider implements NotificationProvider<TelegramSendInput> {
  readonly name = 'telegram';

  readonly channel = 'telegram';

  private readonly botToken: string;

  private bot: unknown = null;

  constructor(options: { botToken: string }) {
    this.botToken = options.botToken;
  }

  async send(input: TelegramSendInput): Promise<ProviderResult> {
    try {
      const TelegramBot = require('node-telegram-bot-api');

      if (!this.bot) {
        this.bot = new TelegramBot(this.botToken);
      }

      if (input.photo) {
        const photoResult = await (this.bot as any).sendPhoto(input.chatId, input.photo, {
          caption: input.text,
          parse_mode: input.parseMode,
          reply_markup: input.buttons
            ? {
                inline_keyboard: input.buttons.map((row) =>
                  row.map((btn) => ({
                    text: btn.text,
                    url: btn.url,
                    callback_data: btn.callbackData,
                  })),
                ),
              }
            : undefined,
        });

        return {
          success: true,
          providerName: this.name,
          channel: this.channel,
          messageId: String(photoResult.message_id),
        };
      }

      if (input.document) {
        const docResult = await (this.bot as any).sendDocument(input.chatId, input.document, {
          caption: input.text,
          parse_mode: input.parseMode,
          reply_markup: input.buttons
            ? {
                inline_keyboard: input.buttons.map((row) =>
                  row.map((btn) => ({
                    text: btn.text,
                    url: btn.url,
                    callback_data: btn.callbackData,
                  })),
                ),
              }
            : undefined,
        });

        return {
          success: true,
          providerName: this.name,
          channel: this.channel,
          messageId: String(docResult.message_id),
        };
      }

      const result = await (this.bot as any).sendMessage(input.chatId, input.text, {
        parse_mode: input.parseMode,
        reply_markup: input.buttons
          ? {
              inline_keyboard: input.buttons.map((row) =>
                row.map((btn) => ({
                  text: btn.text,
                  url: btn.url,
                  callback_data: btn.callbackData,
                })),
              ),
            }
          : undefined,
      });

      return {
        success: true,
        providerName: this.name,
        channel: this.channel,
        messageId: String(result.message_id),
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
