const mockActivityRepo = {
  save: jest.fn().mockImplementation((data) =>
    Promise.resolve({
      id: 'act-1',
      ...data,
      createdAt: new Date(),
    }),
  ),
  createQueryBuilder: jest.fn().mockReturnValue({
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
  }),
  find: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
};

const mockFollowRepo = {
  save: jest.fn(),
  findOne: jest.fn().mockResolvedValue(null),
  find: jest.fn().mockResolvedValue([]),
  delete: jest.fn(),
};

jest.mock(
  'typeorm',
  () => ({
    DataSource: jest.fn().mockImplementation(() => ({
      getRepository: jest
        .fn()
        .mockImplementation((name: string) =>
          name === 'ActivityFeedEntity' ? mockActivityRepo : mockFollowRepo,
        ),
    })),
  }),
  { virtual: true },
);

import { TypeOrmFeedStore } from './typeorm.adapter';

describe('TypeOrmFeedStore', () => {
  let store: TypeOrmFeedStore;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new TypeOrmFeedStore({
      activityRepository: mockActivityRepo,
      followRepository: mockFollowRepo,
    });
  });

  describe('save', () => {
    it('should save and return an activity', async () => {
      const result = await store.save({
        actorId: 'user-1',
        verb: 'post',
        objectId: 'post-1',
        objectType: 'post',
      });

      expect(result.id).toBe('act-1');
      expect(result.actorId).toBe('user-1');
      expect(mockActivityRepo.save).toHaveBeenCalled();
    });
  });

  describe('getFeed', () => {
    it('should query with filters and return paginated result', async () => {
      mockActivityRepo.createQueryBuilder().getMany.mockResolvedValue([]);

      const result = await store.getFeed({ userIds: ['user-1'], limit: 10 });
      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('should detect hasMore when results exceed limit', async () => {
      const rows = Array.from({ length: 11 }, (_, i) => ({
        id: `act-${i}`,
        actorId: 'u1',
        verb: 'post',
        objectId: `p${i}`,
        createdAt: new Date(),
      }));
      mockActivityRepo.createQueryBuilder().getMany.mockResolvedValue(rows);

      const result = await store.getFeed({ userIds: ['u1'], limit: 10 });
      expect(result.items).toHaveLength(10);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('follow / unfollow', () => {
    it('should follow', async () => {
      await store.follow('user-1', 'user-2');
      expect(mockFollowRepo.save).toHaveBeenCalledWith({
        followerId: 'user-1',
        followingId: 'user-2',
      });
    });

    it('should not duplicate follow', async () => {
      mockFollowRepo.findOne.mockResolvedValue({ id: 'existing' });
      await store.follow('user-1', 'user-2');
      expect(mockFollowRepo.save).not.toHaveBeenCalled();
    });

    it('should unfollow', async () => {
      await store.unfollow('user-1', 'user-2');
      expect(mockFollowRepo.delete).toHaveBeenCalledWith({
        followerId: 'user-1',
        followingId: 'user-2',
      });
    });

    it('should get followers', async () => {
      mockFollowRepo.find.mockResolvedValue([{ followerId: 'user-1' }, { followerId: 'user-3' }]);
      const followers = await store.getFollowers('user-2');
      expect(followers).toEqual(['user-1', 'user-3']);
    });

    it('should get following', async () => {
      mockFollowRepo.find.mockResolvedValue([{ followingId: 'user-2' }, { followingId: 'user-4' }]);
      const following = await store.getFollowing('user-1');
      expect(following).toEqual(['user-2', 'user-4']);
    });
  });
});
