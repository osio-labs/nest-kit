import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * TypeORM entity for storing audit-log entries.
 *
 * @example
 * ```typescript
 * import { AuditLogEntity } from '@os.io/nest-kit/infra/audit-log';
 * ```
 */
@Entity({ name: 'audit_log' })
@Index(['resource', 'resourceId'])
@Index(['userId'])
@Index(['organizationId'])
@Index(['action'])
@Index(['createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  @Index()
  action!: string;

  @Column({ length: 255 })
  @Index()
  resource!: string;

  @Column({ name: 'resource_id', length: 255, nullable: true })
  resourceId?: string;

  @Column({ name: 'user_id', length: 255, nullable: true })
  @Index()
  userId?: string;

  @Column({ name: 'organization_id', length: 255, nullable: true })
  @Index()
  organizationId?: string;

  @Column('simple-json', { nullable: true })
  metadata?: Record<string, unknown>;

  @Column('simple-json', { nullable: true })
  diff?: Record<string, { from: unknown; to: unknown }>;

  @Column({ length: 45, nullable: true })
  ip?: string;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  userAgent?: string;

  @Column({ length: 512, nullable: true })
  path?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
