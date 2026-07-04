import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import type {
  WebhookDeliveryRecord,
  WebhookDeliveryStore,
  WebhookDeliveryStatus,
} from '../webhook.types';
import { WebhookDeliveryEntity } from './typeorm.entity';

/**
 * TypeORM-backed implementation of WebhookDeliveryStore.
 *
 * Requires `@nestjs/typeorm` and a registered `TypeOrmModule`.
 * The entity is auto-registered when storage is enabled.
 */
@Injectable()
export class WebhookTypeormStore implements WebhookDeliveryStore {
  constructor(
    @InjectRepository(WebhookDeliveryEntity)
    private readonly repo: Repository<WebhookDeliveryEntity>,
  ) {}

  async save(
    record: Omit<WebhookDeliveryRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<WebhookDeliveryRecord> {
    const entity = this.repo.create({
      url: record.url,
      event: record.event,
      payload: record.payload,
      status: record.status,
      statusCode: record.statusCode,
      responseBody: record.responseBody,
      error: record.error,
      attempts: record.attempts,
      maxRetries: record.maxRetries,
      nextRetryAt: record.nextRetryAt,
    });
    const saved = await this.repo.save(entity);
    return this.toRecord(saved);
  }

  async update(id: string, partial: Partial<WebhookDeliveryRecord>): Promise<void> {
    await this.repo.update(id, {
      ...partial,
      updatedAt: new Date(),
    });
  }

  async findById(id: string): Promise<WebhookDeliveryRecord | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? this.toRecord(entity) : null;
  }

  async findPendingRetries(before: Date, limit = 50): Promise<WebhookDeliveryRecord[]> {
    const entities = await this.repo.find({
      where: {
        status: 'pending' as WebhookDeliveryStatus,
        nextRetryAt: LessThanOrEqual(before),
      },
      take: limit,
      order: { nextRetryAt: 'ASC' },
    });
    return entities.map((e) => this.toRecord(e));
  }

  private toRecord(entity: WebhookDeliveryEntity): WebhookDeliveryRecord {
    return {
      id: entity.id,
      url: entity.url,
      event: entity.event,
      payload: entity.payload,
      status: entity.status as WebhookDeliveryStatus,
      statusCode: entity.statusCode ?? undefined,
      responseBody: entity.responseBody ?? undefined,
      error: entity.error ?? undefined,
      attempts: entity.attempts,
      maxRetries: entity.maxRetries,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      nextRetryAt: entity.nextRetryAt ?? undefined,
    };
  }
}
