import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { signPayload } from '../webhook.utils.js';
import type {
  OutgoingWebhookPayload,
  OutgoingWebhookOptions,
  WebhookDeliveryStore,
  WebhookDeliveryRecord,
} from '../webhook.types.js';
import { WebhookEventBus } from '../event-bus.js';
import { WebhookCircuitBreaker } from '../circuit-breaker.js';
import {
  OUTGOING_WEBHOOK_OPTIONS,
  WEBHOOK_DELIVERY_STORE,
  DEFAULT_MAX_RETRIES,
  DEFAULT_BASE_DELAY_MS,
  DEFAULT_TIMEOUT_MS,
} from '../webhook.constants.js';

/**
 * Service for delivering outgoing webhooks with exponential backoff retry.
 *
 * Features:
 * - Exponential backoff retry with configurable base delay and max retries
 * - HMAC signing of payloads (SHA-256 / SHA-1)
 * - Circuit breaker integration to avoid hammering dead URLs
 * - Event bus emission for decoupled processing
 * - Optional database persistence via WebhookDeliveryStore
 */
@Injectable()
export class OutgoingWebhookService {
  private readonly logger = new Logger(OutgoingWebhookService.name);

  constructor(
    @Inject(OUTGOING_WEBHOOK_OPTIONS)
    private readonly options: OutgoingWebhookOptions,
    private readonly eventBus: WebhookEventBus,
    private readonly circuitBreaker: WebhookCircuitBreaker,
    @Optional()
    @Inject(WEBHOOK_DELIVERY_STORE)
    private readonly store?: WebhookDeliveryStore,
  ) {}

  /**
   * Send a webhook to a target URL with retry logic.
   */
  async send(
    url: string,
    event: string,
    data: unknown,
    options?: { maxRetries?: number; baseDelayMs?: number; timeout?: number },
  ): Promise<WebhookDeliveryRecord> {
    const maxRetries = options?.maxRetries ?? this.options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const baseDelayMs = options?.baseDelayMs ?? this.options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    const timeout = options?.timeout ?? this.options.timeout ?? DEFAULT_TIMEOUT_MS;

    const payload: OutgoingWebhookPayload = {
      id: randomUUID(),
      event,
      createdAt: new Date(),
      data,
    };

    const payloadStr = JSON.stringify(payload);

    const record = await this.saveRecord({
      url,
      event,
      payload: payloadStr,
      status: 'pending',
      attempts: 0,
      maxRetries,
    });

    await this.eventBus.emit('webhook:outgoing:started', { recordId: record.id, url, event });

    await this.deliverWithRetry(record, payloadStr, maxRetries, baseDelayMs, timeout);

    return (await this.store?.findById(record.id)) ?? record;
  }

  private async deliverWithRetry(
    record: WebhookDeliveryRecord,
    payloadStr: string,
    maxRetries: number,
    baseDelayMs: number,
    timeout: number,
  ): Promise<void> {
    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt++;

      if (!this.circuitBreaker.isAllowed(record.url)) {
        this.logger.warn(
          `Circuit open for "${record.url}", skipping attempt ${attempt}/${maxRetries + 1}`,
        );
        await this.updateRecord(record.id, {
          status: 'pending',
          attempts: attempt,
          error: 'Circuit breaker open',
          nextRetryAt: new Date(Date.now() + this.computeDelay(attempt, baseDelayMs)),
        });
        await this.eventBus.emit('webhook:outgoing:skipped', {
          recordId: record.id,
          url: record.url,
          attempt,
        });
        continue;
      }

      try {
        const headers: Record<string, string> = {
          'content-type': 'application/json',
          'x-webhook-id': record.id,
          'x-webhook-event': record.event,
          'x-webhook-attempt': String(attempt),
        };

        if (this.options.signingSecret) {
          const signed = signPayload(
            payloadStr,
            this.options.signingSecret,
            this.options.algorithm,
          );
          headers['x-webhook-signature'] = signed.signature;
          headers['x-webhook-signature-algorithm'] = signed.algorithm;
        }

        const response = await fetch(record.url, {
          method: 'POST',
          headers,
          body: payloadStr,
          signal: AbortSignal.timeout(timeout),
        });

        const responseBody = await response.text();

        if (response.ok) {
          this.circuitBreaker.onSuccess(record.url);
          await this.updateRecord(record.id, {
            status: 'delivered',
            attempts: attempt,
            statusCode: response.status,
            responseBody,
            error: undefined,
            nextRetryAt: undefined,
          });
          await this.eventBus.emit('webhook:outgoing:delivered', {
            recordId: record.id,
            url: record.url,
            statusCode: response.status,
          });
          return;
        }

        this.circuitBreaker.onFailure(record.url);
        await this.updateRecord(record.id, {
          status: attempt > maxRetries ? 'failed' : 'pending',
          attempts: attempt,
          statusCode: response.status,
          responseBody,
          error: `HTTP ${response.status}`,
          nextRetryAt:
            attempt <= maxRetries
              ? new Date(Date.now() + this.computeDelay(attempt, baseDelayMs))
              : undefined,
        });

        this.logger.warn(
          `Webhook delivery to "${record.url}" failed (HTTP ${response.status}), attempt ${attempt}/${maxRetries + 1}`,
        );
      } catch (error) {
        this.circuitBreaker.onFailure(record.url);
        const message = error instanceof Error ? error.message : String(error);

        await this.updateRecord(record.id, {
          status: attempt > maxRetries ? 'failed' : 'pending',
          attempts: attempt,
          error: message,
          nextRetryAt:
            attempt <= maxRetries
              ? new Date(Date.now() + this.computeDelay(attempt, baseDelayMs))
              : undefined,
        });

        this.logger.error(
          `Webhook delivery to "${record.url}" failed: ${message}, attempt ${attempt}/${maxRetries + 1}`,
        );
      }
    }

    await this.eventBus.emit('webhook:outgoing:exhausted', {
      recordId: record.id,
      url: record.url,
    });
  }

  /**
   * Compute exponential backoff delay with jitter.
   */
  private computeDelay(attempt: number, baseDelayMs: number): number {
    const delay = baseDelayMs * 2 ** (attempt - 1);
    const jitter = Math.random() * 0.3 * delay;
    return Math.min(delay + jitter, 300000);
  }

  private async saveRecord(
    data: Omit<WebhookDeliveryRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<WebhookDeliveryRecord> {
    if (this.store) {
      return this.store.save(data);
    }
    const id = randomUUID();
    const now = new Date();
    return {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async updateRecord(id: string, partial: Partial<WebhookDeliveryRecord>): Promise<void> {
    if (this.store) {
      await this.store.update(id, partial);
    }
  }
}
