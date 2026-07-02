import { createTypeOrmAuditLogRepository } from './typeorm.adapter';
import type { AuditLogQuery } from '../audit-log.types';

function createMockQueryBuilder() {
  const qb = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
  };
  return qb;
}

function createMockRepo() {
  const qb = createMockQueryBuilder();
  return {
    create: jest.fn().mockImplementation((data) => data),
    save: jest
      .fn()
      .mockImplementation((data) =>
        Promise.resolve({ id: 'uuid-1', createdAt: new Date(), ...data }),
      ),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOneBy: jest.fn().mockResolvedValue(null),
  };
}

describe('createTypeOrmAuditLogRepository', () => {
  let mockRepo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    mockRepo = createMockRepo();
  });

  it('should save an entry and return it with id and createdAt', async () => {
    const repo = createTypeOrmAuditLogRepository(mockRepo as any);
    const result = await repo.save({
      action: 'user.login',
      resource: 'user',
      resourceId: 'u1',
    });

    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.login' }));
    expect(mockRepo.save).toHaveBeenCalled();
    expect(result.id).toBe('uuid-1');
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should build query with resource filter', async () => {
    const repo = createTypeOrmAuditLogRepository(mockRepo as any);
    const qb = mockRepo.createQueryBuilder();

    await repo.find({ resource: 'user' });

    expect(qb.andWhere).toHaveBeenCalledWith('log.resource = :resource', { resource: 'user' });
    expect(qb.orderBy).toHaveBeenCalledWith('log.createdAt', 'DESC');
  });

  it('should build query with userId filter', async () => {
    const repo = createTypeOrmAuditLogRepository(mockRepo as any);
    const qb = mockRepo.createQueryBuilder();

    await repo.find({ userId: 'u1' });

    expect(qb.andWhere).toHaveBeenCalledWith('log.userId = :userId', { userId: 'u1' });
  });

  it('should build query with organizationId filter', async () => {
    const repo = createTypeOrmAuditLogRepository(mockRepo as any);
    const qb = mockRepo.createQueryBuilder();

    await repo.find({ organizationId: 'org-1' });

    expect(qb.andWhere).toHaveBeenCalledWith('log.organizationId = :organizationId', {
      organizationId: 'org-1',
    });
  });

  it('should build query with action filter', async () => {
    const repo = createTypeOrmAuditLogRepository(mockRepo as any);
    const qb = mockRepo.createQueryBuilder();

    await repo.find({ action: 'user.login' });

    expect(qb.andWhere).toHaveBeenCalledWith('log.action = :action', { action: 'user.login' });
  });

  it('should build query with path filter', async () => {
    const repo = createTypeOrmAuditLogRepository(mockRepo as any);
    const qb = mockRepo.createQueryBuilder();

    await repo.find({ path: '/health' });

    expect(qb.andWhere).toHaveBeenCalledWith('log.path = :path', { path: '/health' });
  });

  it('should build query with date range filters', async () => {
    const repo = createTypeOrmAuditLogRepository(mockRepo as any);
    const qb = mockRepo.createQueryBuilder();
    const from = new Date('2024-01-01');
    const to = new Date('2024-12-31');

    await repo.find({ from, to });

    expect(qb.andWhere).toHaveBeenCalledWith('log.createdAt >= :from', { from });
    expect(qb.andWhere).toHaveBeenCalledWith('log.createdAt <= :to', { to });
  });

  it('should apply limit and offset', async () => {
    const repo = createTypeOrmAuditLogRepository(mockRepo as any);
    const qb = mockRepo.createQueryBuilder();

    await repo.find({ limit: 10, offset: 20 });

    expect(qb.take).toHaveBeenCalledWith(10);
    expect(qb.skip).toHaveBeenCalledWith(20);
  });

  it('count should call getCount on the query builder', async () => {
    const repo = createTypeOrmAuditLogRepository(mockRepo as any);
    const qb = mockRepo.createQueryBuilder();
    qb.getCount.mockResolvedValue(7);

    const result = await repo.count({ resource: 'order' });

    expect(qb.getCount).toHaveBeenCalled();
    expect(result).toBe(7);
  });

  it('findById should call findOneBy with the id', async () => {
    mockRepo.findOneBy.mockResolvedValue({ id: 'abc', action: 'test' } as any);
    const repo = createTypeOrmAuditLogRepository(mockRepo as any);

    const result = await repo.findById('abc');

    expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: 'abc' });
    expect(result).toEqual(expect.objectContaining({ id: 'abc', action: 'test' }));
  });

  it('findById should return null when not found', async () => {
    const repo = createTypeOrmAuditLogRepository(mockRepo as any);

    const result = await repo.findById('nonexistent');

    expect(result).toBeNull();
  });
});
