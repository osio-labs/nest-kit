import { Test } from '@nestjs/testing';
import { ACTIVITY_FEED_STORE } from './activity-feed.constants';
import { ActivityFeedService } from './activity-feed.service';
import type { ActivityFeedStore } from './activity-feed.types';

describe('ActivityFeedService', () => {
  let service: ActivityFeedService;
  const mockStore: jest.Mocked<ActivityFeedStore> = {
    save: jest.fn(),
    getFeed: jest.fn(),
    follow: jest.fn(),
    unfollow: jest.fn(),
    getFollowers: jest.fn(),
    getFollowing: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const modRef = await Test.createTestingModule({
      providers: [{ provide: ACTIVITY_FEED_STORE, useValue: mockStore }, ActivityFeedService],
    }).compile();

    service = modRef.get(ActivityFeedService);
  });

  describe('record', () => {
    it('should delegate to store.save', async () => {
      mockStore.save.mockResolvedValue({
        id: 'act-1',
        actorId: 'u1',
        verb: 'post',
        objectId: 'p1',
        createdAt: new Date(),
      });

      const result = await service.record({
        actorId: 'u1',
        verb: 'post',
        objectId: 'p1',
        objectType: 'post',
      });

      expect(result.id).toBe('act-1');
      expect(mockStore.save).toHaveBeenCalledWith({
        actorId: 'u1',
        verb: 'post',
        objectId: 'p1',
        objectType: 'post',
        targetId: undefined,
        targetType: undefined,
        metadata: undefined,
      });
    });
  });

  describe('getFeed', () => {
    it('should return empty feed when user follows nobody', async () => {
      mockStore.getFollowing.mockResolvedValue([]);

      const result = await service.getFeed('user-1');

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(mockStore.getFeed).not.toHaveBeenCalled();
    });

    it('should fetch activities from followed users', async () => {
      mockStore.getFollowing.mockResolvedValue(['u2', 'u3']);
      mockStore.getFeed.mockResolvedValue({
        items: [{ id: 'a1', actorId: 'u2', verb: 'post', objectId: 'p1', createdAt: new Date() }],
        hasMore: false,
      });

      const result = await service.getFeed('user-1', { limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(mockStore.getFeed).toHaveBeenCalledWith({
        userIds: ['u2', 'u3'],
        verbs: undefined,
        limit: 10,
        offset: undefined,
        cursor: undefined,
      });
    });
  });

  describe('follow / unfollow', () => {
    it('should follow', async () => {
      await service.follow('u1', 'u2');
      expect(mockStore.follow).toHaveBeenCalledWith('u1', 'u2');
    });

    it('should unfollow', async () => {
      await service.unfollow('u1', 'u2');
      expect(mockStore.unfollow).toHaveBeenCalledWith('u1', 'u2');
    });

    it('should get followers', async () => {
      mockStore.getFollowers.mockResolvedValue(['u3']);
      const res = await service.getFollowers('u2');
      expect(res).toEqual(['u3']);
    });

    it('should get following', async () => {
      mockStore.getFollowing.mockResolvedValue(['u2']);
      const res = await service.getFollowing('u1');
      expect(res).toEqual(['u2']);
    });
  });
});
