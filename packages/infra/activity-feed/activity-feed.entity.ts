import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'activity_feed_activities' })
@Index(['actorId'])
@Index(['verb'])
@Index(['createdAt'])
export class ActivityFeedEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'actor_id', length: 255 })
  @Index()
  actorId!: string;

  @Column({ length: 100 })
  verb!: string;

  @Column({ name: 'object_id', length: 255 })
  objectId!: string;

  @Column({ name: 'object_type', length: 100, nullable: true })
  objectType?: string;

  @Column({ name: 'target_id', length: 255, nullable: true })
  targetId?: string;

  @Column({ name: 'target_type', length: 100, nullable: true })
  targetType?: string;

  @Column('simple-json', { nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
