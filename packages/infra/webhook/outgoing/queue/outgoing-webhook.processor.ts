import { Injectable, Logger } from '@nestjs/common';
import { OutgoingWebhookService } from '../outgoing-webhook.service';

/**
 * Processor for outgoing webhook delivery via BullMQ.
 *
 * This class is a plain `@Injectable` that wraps the delivery logic.
 * To register it as a BullMQ worker, use `createBullMqWorker()`.
 */
@Injectable()
export class OutgoingWebhookProcessor {
  private readonly logger = new Logger(OutgoingWebhookProcessor.name);

  constructor(private readonly outgoingService: OutgoingWebhookService) {}

  async process(job: {
    id?: string;
    data: {
      url: string;
      event: string;
      data: unknown;
      maxRetries: number;
      baseDelayMs: number;
      timeout?: number;
    };
  }): Promise<void> {
    const { url, event, data, maxRetries, baseDelayMs, timeout } = job.data;

    this.logger.log(`Processing queued webhook: ${event} -> ${url} (job ${job.id})`);

    try {
      await this.outgoingService.send(url, event, data, {
        maxRetries,
        baseDelayMs,
        timeout,
      });
      this.logger.log(`Queued webhook delivered: ${event} -> ${url}`);
    } catch (error) {
      this.logger.error(
        `Queued webhook failed: ${event} -> ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}

/**
 * Create a BullMQ WorkerHost class with the `@Processor()` decorator.
 *
 * Call this at runtime when `@nestjs/bullmq` is available.
 * Returns `null` if the optional peer dependency is not installed.
 *
 * @example
 * ```typescript
 * const WorkerClass = await createBullMqWorker();
 * if (WorkerClass) {
 *   // register WorkerClass as a provider
 * }
 * ```
 */
export async function createBullMqWorker(): Promise<unknown> {
  try {
    // @ts-expect-error - @nestjs/bullmq is an optional peer dependency
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { Processor, WorkerHost } = await import('@nestjs/bullmq');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    @Processor('webhook:outgoing', { concurrency: 5 })
    class DynamicOutgoingWebhookWorker extends WorkerHost {
      private readonly logger = new Logger('OutgoingWebhookQueue');

      constructor(private readonly outgoingService: OutgoingWebhookService) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        super();
      }

      async process(job: unknown): Promise<void> {
        const j = job as {
          id?: string;
          data: {
            url: string;
            event: string;
            data: unknown;
            maxRetries: number;
            baseDelayMs: number;
            timeout?: number;
          };
        };
        const { url, event, data, maxRetries, baseDelayMs, timeout } = j.data;

        this.logger.log(`Processing queued webhook: ${event} -> ${url} (job ${j.id})`);

        try {
          await this.outgoingService.send(url, event, data, {
            maxRetries,
            baseDelayMs,
            timeout,
          });
          this.logger.log(`Queued webhook delivered: ${event} -> ${url}`);
        } catch (error) {
          this.logger.error(
            `Queued webhook failed: ${event} -> ${url}: ${error instanceof Error ? error.message : String(error)}`,
          );
          throw error;
        }
      }
    }

    return DynamicOutgoingWebhookWorker;
  } catch {
    return null;
  }
}
