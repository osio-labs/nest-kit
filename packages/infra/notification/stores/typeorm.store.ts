import type { Repository } from 'typeorm';
import { NotificationLogEntity } from '../notification.entity';
import type {
  ChannelType,
  ChannelResult,
  NotificationRecord,
  NotificationStore,
  SendInput,
} from '../notification.types';

/**
 * TypeORM-backed notification store.
 *
 * Persists notifications to the `notification_logs` table using a
 * standard TypeORM repository. The `results` and `input` columns are
 * stored as JSON strings via TypeORM's `simple-json` type.
 */
export class TypeOrmNotificationStore implements NotificationStore {
  constructor(private readonly repo: Repository<NotificationLogEntity>) {}

  /**
   * Persist a new notification record.
   */
  async save(record: Omit<NotificationRecord, 'id' | 'createdAt'>): Promise<NotificationRecord> {
    const entity = this.repo.create({
      channels: record.channels,
      status: record.status,
      results: JSON.stringify(record.results),
      input: JSON.stringify(record.input),
    });

    const saved = await this.repo.save(entity);

    return this.toRecord(saved);
  }

  /**
   * Look up a record by its ID.
   */
  async findById(id: string): Promise<NotificationRecord | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? this.toRecord(entity) : null;
  }

  /**
   * Find records that include the given channel.
   */
  async findByChannel(channel: ChannelType, limit?: number): Promise<NotificationRecord[]> {
    const qb = this.repo.createQueryBuilder('log');
    qb.where('log.channels LIKE :channel', { channel: `%${channel}%` });
    if (limit) qb.take(limit);

    const entities = await qb.getMany();
    return entities.map((e) => this.toRecord(e));
  }

  /**
   * Update the status of an existing record.
   */
  async updateStatus(id: string, status: NotificationRecord['status']): Promise<void> {
    await this.repo.update(id, { status });
  }

  private toRecord(entity: NotificationLogEntity): NotificationRecord {
    return {
      id: entity.id,
      channels: entity.channels as ChannelType[],
      status: entity.status as NotificationRecord['status'],
      results: JSON.parse(entity.results) as ChannelResult[],
      input: JSON.parse(entity.input) as SendInput,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
