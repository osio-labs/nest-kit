/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */

import type {
  ActivityFeedStore,
  Activity,
  FeedFilters,
  PaginatedFeed,
} from '../activity-feed.types.js';

export interface TypeOrmFeedStoreOptions {
  /** TypeORM repository for activities. */
  activityRepository?: any;
  /** TypeORM repository for follow relationships. */
  followRepository?: any;
  /** Pre-configured TypeORM DataSource. */
  dataSource?: any;
}

/**
 * TypeORM-backed activity feed store.
 *
 * Uses two tables:
 * - `activity_feed_activities` — stores activity entries
 * - `activity_feed_follows` — stores follow relationships
 *
 * Requires `typeorm` and `@nestjs/typeorm` as peer dependencies.
 */
export class TypeOrmFeedStore implements ActivityFeedStore {
  private activityRepo: any;
  private followRepo: any;

  constructor(options: TypeOrmFeedStoreOptions = {}) {
    this.activityRepo = options.activityRepository;
    this.followRepo = options.followRepository;

    if (!this.activityRepo || !this.followRepo) {
      this.initFromDataSource(options.dataSource);
    }
  }

  private initFromDataSource(dataSource?: any): void {
    try {
      const ds = dataSource ?? this.getDefaultDataSource();
      this.activityRepo = ds.getRepository('ActivityFeedEntity');
      this.followRepo = ds.getRepository('ActivityFeedFollowEntity');
    } catch {
      throw new Error(
        'TypeOrmFeedStore requires repositories or a DataSource.\n' +
          'Provide them via options or install and configure @nestjs/typeorm.',
      );
    }
  }

  private getDefaultDataSource(): any {
    try {
      const { DataSource } = require('typeorm');
      return new DataSource({/* user must configure */});
    } catch {
      throw new Error(
        'Cannot find module "typeorm".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install typeorm\n',
      );
    }
  }

  async save(entry: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> {
    const saved = await this.activityRepo.save({
      actorId: entry.actorId,
      verb: entry.verb,
      objectId: entry.objectId,
      objectType: entry.objectType,
      targetId: entry.targetId,
      targetType: entry.targetType,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
    return {
      id: saved.id,
      actorId: saved.actorId,
      verb: saved.verb,
      objectId: saved.objectId,
      objectType: saved.objectType,
      targetId: saved.targetId,
      targetType: saved.targetType,
      metadata: saved.metadata ? JSON.parse(saved.metadata) : undefined,
      createdAt: saved.createdAt,
    };
  }

  async getFeed(filters: FeedFilters): Promise<PaginatedFeed> {
    const qb = this.activityRepo.createQueryBuilder('a');

    if (filters.userIds?.length) {
      qb.andWhere('a.actorId IN (:...userIds)', { userIds: filters.userIds });
    }
    if (filters.verbs?.length) {
      qb.andWhere('a.verb IN (:...verbs)', { verbs: filters.verbs });
    }
    if (filters.from) {
      qb.andWhere('a.createdAt >= :from', { from: filters.from });
    }
    if (filters.to) {
      qb.andWhere('a.createdAt <= :to', { to: filters.to });
    }

    qb.orderBy('a.createdAt', 'DESC');

    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;
    qb.skip(offset).take(limit + 1);

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: items.map((r: any) => this.toActivity(r)),
      total: await qb.getCount(),
      hasMore,
    };
  }

  async follow(followerId: string, followingId: string): Promise<void> {
    const existing = await this.followRepo.findOne({
      where: { followerId, followingId },
    });
    if (!existing) {
      await this.followRepo.save({ followerId, followingId });
    }
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.followRepo.delete({ followerId, followingId });
  }

  async getFollowers(userId: string): Promise<string[]> {
    const rows = await this.followRepo.find({
      where: { followingId: userId },
      select: ['followerId'],
    });
    return rows.map((r: any) => r.followerId);
  }

  async getFollowing(userId: string): Promise<string[]> {
    const rows = await this.followRepo.find({
      where: { followerId: userId },
      select: ['followingId'],
    });
    return rows.map((r: any) => r.followingId);
  }

  private toActivity(row: any): Activity {
    return {
      id: row.id,
      actorId: row.actorId,
      verb: row.verb,
      objectId: row.objectId,
      objectType: row.objectType,
      targetId: row.targetId,
      targetType: row.targetType,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.createdAt,
    };
  }
}
