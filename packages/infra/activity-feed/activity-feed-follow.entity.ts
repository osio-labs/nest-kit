import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity({ name: 'activity_feed_follows' })
@Unique(['followerId', 'followingId'])
@Index(['followerId'])
@Index(['followingId'])
export class ActivityFeedFollowEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'follower_id', length: 255 })
  @Index()
  followerId!: string;

  @Column({ name: 'following_id', length: 255 })
  @Index()
  followingId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
