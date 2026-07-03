import { Test } from '@nestjs/testing';
import { ACTIVITY_FEED_STORE, ACTIVITY_FEED_MODULE_OPTIONS } from './activity-feed.constants';
import { ActivityFeedModule } from './activity-feed.module';
import { ActivityFeedService } from './activity-feed.service';
import { MemoryFeedStore } from './adapters/memory.adapter';

describe('ActivityFeedModule', () => {
  describe('forRoot', () => {
    it('should create a module with the provided store', async () => {
      const store = new MemoryFeedStore();
      const modRef = await Test.createTestingModule({
        imports: [ActivityFeedModule.forRoot({ store })],
      }).compile();

      const svc = modRef.get(ActivityFeedService);
      expect(svc).toBeInstanceOf(ActivityFeedService);

      const resolvedStore = modRef.get(ACTIVITY_FEED_STORE);
      expect(resolvedStore).toBe(store);
    });

    it('should be global by default', async () => {
      const store = new MemoryFeedStore();
      const mod = ActivityFeedModule.forRoot({ store });
      expect(mod.global).toBe(true);
    });

    it('should respect global: false', async () => {
      const store = new MemoryFeedStore();
      const mod = ActivityFeedModule.forRoot({ store, global: false });
      expect(mod.global).toBe(false);
    });
  });

  describe('forRootAsync', () => {
    it('should create module via useFactory', async () => {
      const store = new MemoryFeedStore();
      const modRef = await Test.createTestingModule({
        imports: [
          ActivityFeedModule.forRootAsync({
            useFactory: () => ({ store }),
          }),
        ],
      }).compile();

      const svc = modRef.get(ActivityFeedService);
      expect(svc).toBeInstanceOf(ActivityFeedService);

      const resolvedStore = modRef.get(ACTIVITY_FEED_STORE);
      expect(resolvedStore).toBe(store);
    });
  });
});
