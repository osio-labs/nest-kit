import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('webhook_deliveries')
export class WebhookDeliveryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  url!: string;

  @Column()
  event!: string;

  @Column({ type: 'text' })
  payload!: string;

  @Column({ length: 20 })
  @Index()
  status!: string;

  @Column({ nullable: true })
  statusCode?: number;

  @Column({ type: 'text', nullable: true })
  responseBody?: string;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ default: 0 })
  attempts!: number;

  @Column({ default: 5 })
  maxRetries!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  @Index()
  nextRetryAt?: Date;
}
