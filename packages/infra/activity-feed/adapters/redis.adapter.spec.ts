const mockRedis: Record<string, any> = {
  zadd: jest.fn().mockResolvedValue(1),
  zrevrange: jest.fn().mockResolvedValue([]),
  zunionstore: jest.fn().mockResolvedValue('tmp-key'),
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
  mget: jest.fn().mockResolvedValue([]),
  sadd: jest.fn().mockResolvedValue(1),
  srem: jest.fn().mockResolvedValue(1),
  smembers: jest.fn().mockResolvedValue([]),
  pipeline: jest.fn().mockReturnValue({
    zadd: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  }),
};

jest.mock(
  'ioredis',
  () => {
    const MockRedis = jest.fn().mockImplementation(() => mockRedis);
    return MockRedis;
  },
  { virtual: true },
);

import { RedisFeedStore } from './redis.adapter.js';

describe('RedisFeedStore', () => {
  let store: RedisFeedStore;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new RedisFeedStore({ client: mockRedis as any });
  });

  describe('save', () => {
    it('should save activity to sorted set and data key', async () => {
      mockRedis.smembers.mockResolvedValue([]); // no followers

      const result = await store.save({
        actorId: 'user-1',
        verb: 'post',
        objectId: 'post-1',
        objectType: 'post',
      });

      expect(result.id).toBeDefined();
      expect(result.actorId).toBe('user-1');
      expect(mockRedis.zadd).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should fan-out to followers', async () => {
      mockRedis.smembers.mockResolvedValue(['follower-1', 'follower-2']);

      await store.save({
        actorId: 'user-1',
        verb: 'post',
        objectId: 'post-1',
        objectType: 'post',
      });

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });

  describe('getFeed', () => {
    it('should return empty when no userIds or verbs', async () => {
      const result = await store.getFeed({});
      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('should fetch activities by userIds', async () => {
      mockRedis.zrevrange.mockResolvedValue(['id-1', 'id-2']);
      mockRedis.mget.mockResolvedValue([
        JSON.stringify({
          id: 'id-1',
          actorId: 'u1',
          verb: 'post',
          createdAt: new Date().toISOString(),
        }),
        JSON.stringify({
          id: 'id-2',
          actorId: 'u2',
          verb: 'like',
          createdAt: new Date().toISOString(),
        }),
      ]);

      const result = await store.getFeed({ userIds: ['u1'], limit: 10 });
      expect(result.items).toHaveLength(2);
      expect(result.items[0].createdAt).toBeInstanceOf(Date);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('follow / unfollow', () => {
    it('should follow', async () => {
      await store.follow('user-1', 'user-2');
      expect(mockRedis.sadd).toHaveBeenCalledWith('feed:following:user-1', 'user-2');
      expect(mockRedis.sadd).toHaveBeenCalledWith('feed:followers:user-2', 'user-1');
    });

    it('should unfollow', async () => {
      await store.unfollow('user-1', 'user-2');
      expect(mockRedis.srem).toHaveBeenCalledWith('feed:following:user-1', 'user-2');
    });

    it('should get followers', async () => {
      mockRedis.smembers.mockResolvedValue(['user-1', 'user-3']);
      const followers = await store.getFollowers('user-2');
      expect(followers).toEqual(['user-1', 'user-3']);
    });

    it('should get following', async () => {
      mockRedis.smembers.mockResolvedValue(['user-2', 'user-4']);
      const following = await store.getFollowing('user-1');
      expect(following).toEqual(['user-2', 'user-4']);
    });
  });
});
