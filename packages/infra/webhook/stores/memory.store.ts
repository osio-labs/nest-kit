import { randomUUID } from 'node:crypto';
import type { WebhookDeliveryRecord, WebhookDeliveryStore } from '../webhook.types.js';

/**
 * In-memory implementation of WebhookDeliveryStore.
 *
 * Useful for development and testing. Does not survive restarts.
 */
export class WebhookMemoryStore implements WebhookDeliveryStore {
  private readonly records = new Map<string, WebhookDeliveryRecord>();

  save(
    record: Omit<WebhookDeliveryRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<WebhookDeliveryRecord> {
    const now = new Date();
    const full: WebhookDeliveryRecord = {
      ...record,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(full.id, full);
    return Promise.resolve(full);
  }

  update(id: string, partial: Partial<WebhookDeliveryRecord>): Promise<void> {
    const existing = this.records.get(id);
    if (existing) {
      this.records.set(id, { ...existing, ...partial, updatedAt: new Date() });
    }
    return Promise.resolve();
  }

  findById(id: string): Promise<WebhookDeliveryRecord | null> {
    return Promise.resolve(this.records.get(id) ?? null);
  }

  findPendingRetries(before: Date, limit = 50): Promise<WebhookDeliveryRecord[]> {
    const pending: WebhookDeliveryRecord[] = [];
    for (const record of this.records.values()) {
      if (record.status === 'pending' && record.nextRetryAt && record.nextRetryAt <= before) {
        pending.push(record);
      }
      if (pending.length >= limit) break;
    }
    return Promise.resolve(pending);
  }
}
