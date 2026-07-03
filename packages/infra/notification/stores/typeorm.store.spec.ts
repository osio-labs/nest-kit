import type { Repository } from 'typeorm';
import { NotificationLogEntity } from '../notification.entity';
import { TypeOrmNotificationStore } from './typeorm.store';
import type { ChannelType, NotificationRecord } from '../notification.types';

function createMockRepo(): jest.Mocked<Partial<Repository<NotificationLogEntity>>> {
  const mock = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
  };

  mock.createQueryBuilder.mockReturnValue({
    where: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  });

  return mock as any;
}

const mockInput = { email: { to: 'test@test.com', subject: 'Test', body: 'Hello' } };
const mockResults = [
  {
    channel: 'email' as ChannelType,
    results: [{ success: true, providerName: 'sendgrid', channel: 'email' as ChannelType }],
  },
];

function createMockEntity(overrides: Partial<NotificationLogEntity> = {}): NotificationLogEntity {
  return {
    id: 'uuid-1',
    channels: ['email'],
    status: 'sent',
    results: JSON.stringify(mockResults),
    input: JSON.stringify(mockInput),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  } as NotificationLogEntity;
}

describe('TypeOrmNotificationStore', () => {
  let repo: jest.Mocked<Partial<Repository<NotificationLogEntity>>>;
  let store: TypeOrmNotificationStore;

  beforeEach(() => {
    repo = createMockRepo();
    store = new TypeOrmNotificationStore(repo as any);
  });

  describe('save', () => {
    it('should create entity and return NotificationRecord', async () => {
      const entity = createMockEntity();
      repo.create!.mockReturnValue(entity);
      repo.save!.mockResolvedValue(entity);

      const record = await store.save({
        channels: ['email'],
        status: 'sent',
        results: mockResults as any,
        input: mockInput as any,
      });

      expect(repo.create).toHaveBeenCalledWith({
        channels: ['email'],
        status: 'sent',
        results: JSON.stringify(mockResults),
        input: JSON.stringify(mockInput),
      });
      expect(repo.save).toHaveBeenCalledWith(entity);

      expect(record).toEqual({
        id: 'uuid-1',
        channels: ['email'],
        status: 'sent',
        results: mockResults,
        input: mockInput,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      });
    });
  });

  describe('findById', () => {
    it('should return record when entity exists', async () => {
      const entity = createMockEntity();
      repo.findOneBy!.mockResolvedValue(entity);

      const record = await store.findById('uuid-1');

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'uuid-1' });
      expect(record).toEqual({
        id: 'uuid-1',
        channels: ['email'],
        status: 'sent',
        results: mockResults,
        input: mockInput,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      });
    });

    it('should return null when entity does not exist', async () => {
      repo.findOneBy!.mockResolvedValue(null);

      const record = await store.findById('non-existent');

      expect(record).toBeNull();
    });
  });

  describe('findByChannel', () => {
    it('should use query builder with LIKE and limit', async () => {
      const entity = createMockEntity();
      const qb = repo.createQueryBuilder!();
      (qb.getMany as jest.Mock).mockResolvedValue([entity]);

      const records = await store.findByChannel('email', 10);

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('log');
      expect(qb.where).toHaveBeenCalledWith('log.channels LIKE :channel', {
        channel: '%email%',
      });
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(records).toHaveLength(1);
    });

    it('should not apply limit when not provided', async () => {
      repo.createQueryBuilder!().getMany = jest.fn().mockResolvedValue([]);

      await store.findByChannel('sms');

      const qb = repo.createQueryBuilder!();
      expect(qb.take).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should call repo.update with id and status', async () => {
      await store.updateStatus('uuid-1', 'failed');

      expect(repo.update).toHaveBeenCalledWith('uuid-1', { status: 'failed' });
    });
  });
});
