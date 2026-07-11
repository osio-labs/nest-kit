import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  NOTIFICATION_MODULE_OPTIONS,
  NOTIFICATION_QUEUE,
  NOTIFICATION_STORE,
} from './notification.constants.js';
import type { NotificationProvider } from './notification.constants.js';
import type {
  ChannelType,
  ChannelResult,
  NotificationModuleOptions,
  NotificationRecord,
  NotificationResult,
  NotificationStore,
  ProviderResult,
  SendInput,
} from './notification.types.js';

/**
 * Core notification service.
 *
 * Orchestrates multi-channel notification delivery through configured
 * providers. Supports email, SMS, push, Telegram, and Slack channels
 * with optional queuing (via Bull) and persistence (via a store).
 *
 * @example
 * ```typescript
 * const result = await notificationService.send({
 *   email: { to: 'user@example.com', subject: 'Hi', body: '<h1>Hello</h1>' },
 * });
 * ```
 */
@Injectable()
export class NotificationService {
  constructor(
    @Inject(NOTIFICATION_MODULE_OPTIONS)
    private readonly options: NotificationModuleOptions,
    @Optional()
    @Inject(NOTIFICATION_STORE)
    private readonly store?: NotificationStore,
    @Optional()
    @Inject(NOTIFICATION_QUEUE)
    private readonly queue?: unknown,
  ) {}

  /**
   * Send a notification through one or more channels.
   *
   * When queuing is enabled the notification is delegated to `enqueue()`
   * instead of being sent immediately.
   */
  async send(input: SendInput): Promise<NotificationResult> {
    const channels = this.determineChannels(input);

    if (channels.length === 0) {
      return { success: false, channels: [], timestamp: new Date() };
    }

    // Delegate to queue when enabled
    if (this.options.queue?.enabled && this.queue) {
      await this.enqueue(input);
      return { id: undefined, success: true, channels: [], timestamp: new Date() };
    }

    const channelResults: ChannelResult[] = [];
    const parallel = this.options.parallel ?? true;

    for (const channel of channels) {
      const providers = (
        this.options.providers as Record<string, NotificationProvider[] | undefined>
      )[channel];
      if (!providers?.length) continue;

      const message = (input as Record<string, unknown>)[channel];
      const result = await this.sendToChannel(channel, message, providers, parallel);
      channelResults.push(result);
    }

    const allSuccess =
      channelResults.length > 0 && channelResults.every((cr) => cr.results.every((r) => r.success));
    const anySuccess = channelResults.some((cr) => cr.results.some((r) => r.success));
    const status = allSuccess ? 'sent' : anySuccess ? 'partial' : 'failed';

    const result: NotificationResult = {
      id: undefined,
      success: allSuccess,
      channels: channelResults,
      timestamp: new Date(),
    };

    if (this.options.storage?.enabled && this.store) {
      const record = await this.store.save({
        channels,
        status,
        results: channelResults,
        input,
      });
      result.id = record.id;
    }

    return result;
  }

  /**
   * Enqueue a notification for asynchronous delivery.
   *
   * Requires a Bull queue to have been configured in the module options.
   */
  async enqueue(input: SendInput): Promise<{ queued: boolean; jobId?: string }> {
    if (!this.queue) {
      return { queued: false };
    }

    try {
      /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      const job = await (this.queue as any).add('notification', input);
      return { queued: true, jobId: job.id as string | undefined };
      /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    } catch {
      return { queued: false };
    }
  }

  /**
   * Retrieve the current status of a previously sent notification.
   */
  async getStatus(id: string): Promise<NotificationRecord | null> {
    if (!this.store) return null;
    return this.store.findById(id);
  }

  private determineChannels(input: SendInput): ChannelType[] {
    const channels: ChannelType[] = [];
    if (input.email) channels.push('email');
    if (input.sms) channels.push('sms');
    if (input.push) channels.push('push');
    if (input.telegram) channels.push('telegram');
    if (input.slack) channels.push('slack');
    if (input.teams) channels.push('teams');
    if (input.googlechat) channels.push('googlechat');
    return channels;
  }

  private async sendToChannel(
    channel: ChannelType,
    message: unknown,
    providers: NotificationProvider[],
    parallel: boolean,
  ): Promise<ChannelResult> {
    if (parallel) {
      const settled = await Promise.allSettled(providers.map((p) => p.send(message)));

      return {
        channel,
        results: settled.map((r, i) =>
          r.status === 'fulfilled'
            ? r.value
            : {
                success: false,
                providerName: providers[i]?.name ?? 'unknown',
                channel,
                error: r.reason instanceof Error ? r.reason.message : String(r.reason),
              },
        ),
      };
    }

    // Sequential delivery
    const results: ProviderResult[] = [];
    for (const provider of providers) {
      try {
        const providerResult = await provider.send(message);
        results.push(providerResult);
      } catch (error: unknown) {
        results.push({
          success: false,
          providerName: provider.name,
          channel,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { channel, results };
  }
}
