import { Repository } from 'typeorm';
import { AuditLogEntity } from '../audit-log.entity.js';
import type { AuditLogEntry, AuditLogQuery, AuditLogRepository } from '../audit-log.types.js';

function buildQuery(
  qb: Repository<AuditLogEntity>,
  query: AuditLogQuery,
): ReturnType<Repository<AuditLogEntity>['createQueryBuilder']> {
  const builder = qb.createQueryBuilder('log');

  if (query.resource) {
    builder.andWhere('log.resource = :resource', { resource: query.resource });
  }
  if (query.resourceId) {
    builder.andWhere('log.resourceId = :resourceId', { resourceId: query.resourceId });
  }
  if (query.userId) {
    builder.andWhere('log.userId = :userId', { userId: query.userId });
  }
  if (query.organizationId) {
    builder.andWhere('log.organizationId = :organizationId', {
      organizationId: query.organizationId,
    });
  }
  if (query.action) {
    builder.andWhere('log.action = :action', { action: query.action });
  }
  if (query.path) {
    builder.andWhere('log.path = :path', { path: query.path });
  }
  if (query.from) {
    builder.andWhere('log.createdAt >= :from', { from: query.from });
  }
  if (query.to) {
    builder.andWhere('log.createdAt <= :to', { to: query.to });
  }

  builder.orderBy('log.createdAt', 'DESC');

  if (query.limit) builder.take(query.limit);
  if (query.offset) builder.skip(query.offset);

  return builder;
}

export function createTypeOrmAuditLogRepository(
  repo: Repository<AuditLogEntity>,
): AuditLogRepository {
  return {
    async save(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
      const entity = repo.create(entry as unknown as AuditLogEntity);
      const saved = await repo.save(entity);
      return saved as unknown as AuditLogEntry;
    },

    async find(query: AuditLogQuery): Promise<AuditLogEntry[]> {
      const entities = await buildQuery(repo, query).getMany();
      return entities as unknown as AuditLogEntry[];
    },

    async count(query: AuditLogQuery): Promise<number> {
      return buildQuery(repo, query).getCount();
    },

    async findById(id: string): Promise<AuditLogEntry | null> {
      const entity = await repo.findOneBy({ id });
      return entity as unknown as AuditLogEntry | null;
    },
  };
}
