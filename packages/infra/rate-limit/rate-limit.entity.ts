import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity({ name: 'rate_limits' })
@Index(['expiresAt'])
export class RateLimitEntity {
  @PrimaryColumn({ length: 255 })
  key!: string;

  @Column({ default: 0 })
  count!: number;

  @Column({ type: 'bigint' })
  expiresAt!: number;

  @Column({ default: 60 })
  windowSeconds!: number;
}
