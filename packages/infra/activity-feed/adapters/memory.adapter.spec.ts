import { MemoryFeedStore } from './memory.adapter';

describe('MemoryFeedStore', () => {
  let store: MemoryFeedStore;

  beforeEach(() => {
    store = new MemoryFeedStore();
  });

  describe('save', () => {
    it('should save an activity with id and createdAt', async () => {
      const result = await store.save({
        actorId: 'user-1',
        verb: 'post',
        objectId: 'post-1',
        objectType: 'post',
      });

      expect(result.id).toBeDefined();
      expect(result.actorId).toBe('user-1');
      expect(result.verb).toBe('post');
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getFeed', () => {
    it('should return activities by userIds', async () => {
      await store.save({ actorId: 'user-1', verb: 'post', objectId: 'p1', objectType: 'post' });
      await store.save({ actorId: 'user-2', verb: 'like', objectId: 'p1', objectType: 'post' });
      await store.save({ actorId: 'user-1', verb: 'comment', objectId: 'p2', objectType: 'post' });

      const feed = await store.getFeed({ userIds: ['user-1'], limit: 10 });
      expect(feed.items).toHaveLength(2);
      expect(feed.total).toBe(2);
    });

    it('should filter by verbs', async () => {
      await store.save({ actorId: 'u1', verb: 'post', objectId: 'p1', objectType: 'post' });
      await store.save({ actorId: 'u1', verb: 'like', objectId: 'p2', objectType: 'post' });

      const feed = await store.getFeed({ verbs: ['post'] });
      expect(feed.items).toHaveLength(1);
      expect(feed.items[0].verb).toBe('post');
    });

    it('should paginate with limit and offset', async () => {
      for (let i = 0; i < 10; i++) {
        await store.save({ actorId: 'u1', verb: 'post', objectId: `p${i}`, objectType: 'post' });
      }

      const page1 = await store.getFeed({ userIds: ['u1'], limit: 3, offset: 0 });
      expect(page1.items).toHaveLength(3);
      expect(page1.hasMore).toBe(true);
      expect(page1.total).toBe(10);

      const page4 = await store.getFeed({ userIds: ['u1'], limit: 3, offset: 9 });
      expect(page4.items).toHaveLength(1);
      expect(page4.hasMore).toBe(false);
    });

    it('should return empty feed when no match', async () => {
      const feed = await store.getFeed({ userIds: ['nonexistent'] });
      expect(feed.items).toEqual([]);
      expect(feed.hasMore).toBe(false);
    });
  });

  describe('follow / unfollow', () => {
    it('should follow and return following', async () => {
      await store.follow('user-1', 'user-2');
      const following = await store.getFollowing('user-1');
      expect(following).toEqual(['user-2']);
    });

    it('should unfollow', async () => {
      await store.follow('user-1', 'user-2');
      await store.unfollow('user-1', 'user-2');
      const following = await store.getFollowing('user-1');
      expect(following).toEqual([]);
    });

    it('should return followers', async () => {
      await store.follow('user-1', 'user-2');
      await store.follow('user-3', 'user-2');
      const followers = await store.getFollowers('user-2');
      expect(followers).toEqual(expect.arrayContaining(['user-1', 'user-3']));
    });
  });
});
