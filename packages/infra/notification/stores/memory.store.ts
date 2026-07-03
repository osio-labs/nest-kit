/* eslint-disable @typescript-eslint/require-await */

import type { NotificationRecord, NotificationStore, ChannelType } from '../notification.types';

/**
 * In-memory notification store.
 *
 * Keeps all records in a `Map` keyed by ID. Useful for testing and
 * single-process environments where persistence is not required.
 */
export class MemoryNotificationStore implements NotificationStore {
  private readonly records = new Map<string, NotificationRecord>();

  /**
   * Persist a new notification record.
   * Generates a UUID and sets `createdAt` automatically.
   */
  async save(record: Omit<NotificationRecord, 'id' | 'createdAt'>): Promise<NotificationRecord> {
    const id = crypto.randomUUID();
    const saved: NotificationRecord = {
      id,
      ...record,
      createdAt: new Date(),
    };
    this.records.set(id, saved);
    return saved;
  }

  /**
   * Look up a record by its ID.
   */
  async findById(id: string): Promise<NotificationRecord | null> {
    return this.records.get(id) ?? null;
  }

  /**
   * Find records that include the given channel.
   */
  async findByChannel(channel: ChannelType, limit?: number): Promise<NotificationRecord[]> {
    const matched: NotificationRecord[] = [];
    for (const record of this.records.values()) {
      if (record.channels.includes(channel)) {
        matched.push(record);
      }
    }
    return limit ? matched.slice(0, limit) : matched;
  }

  /**
   * Update the status of an existing record in-place.
   */
  async updateStatus(id: string, status: NotificationRecord['status']): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      record.status = status;
      record.updatedAt = new Date();
    }
  }
}
