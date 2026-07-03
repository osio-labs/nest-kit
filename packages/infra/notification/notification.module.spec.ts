import { Test } from '@nestjs/testing';
import { NotificationModule } from './notification.module';
import {
  NOTIFICATION_MODULE_OPTIONS,
  NOTIFICATION_QUEUE,
  NOTIFICATION_STORE,
} from './notification.constants';
import { NotificationService } from './notification.service';
import type { NotificationModuleOptions } from './notification.types';

describe('NotificationModule', () => {
  describe('forRoot()', () => {
    it('should return a dynamic module with NotificationService exported', () => {
      const mod = NotificationModule.forRoot({ providers: {} });
      expect(mod.module).toBe(NotificationModule);
      expect(mod.exports).toContain(NotificationService);
      expect(mod.global).toBe(true);
    });

    it('should include options provider', () => {
      const mod = NotificationModule.forRoot({ providers: {} });
      const optionsProvider = (mod.providers ?? []).find(
        (p: any) => p.provide === NOTIFICATION_MODULE_OPTIONS,
      );
      expect(optionsProvider).toBeDefined();
      expect(optionsProvider!.useValue).toEqual({ providers: {} });
    });

    it('should include store provider when storage enabled and store provided', () => {
      const store = {
        save: jest.fn(),
        findById: jest.fn(),
        findByChannel: jest.fn(),
        updateStatus: jest.fn(),
      };
      const mod = NotificationModule.forRoot({
        providers: {},
        storage: { enabled: true, store },
      });
      const storeProvider = (mod.providers ?? []).find(
        (p: any) => p.provide === NOTIFICATION_STORE,
      );
      expect(storeProvider).toBeDefined();
      expect(storeProvider!.useValue).toBe(store);
    });

    it('should not include store provider when storage disabled', () => {
      const mod = NotificationModule.forRoot({ providers: {} });
      const storeProvider = (mod.providers ?? []).find(
        (p: any) => p.provide === NOTIFICATION_STORE,
      );
      expect(storeProvider).toBeUndefined();
    });

    it('should include queue provider when queue enabled and bull provided', () => {
      const bull = { add: jest.fn() };
      const mod = NotificationModule.forRoot({
        providers: {},
        queue: { enabled: true, bull },
      });
      const queueProvider = (mod.providers ?? []).find(
        (p: any) => p.provide === NOTIFICATION_QUEUE,
      );
      expect(queueProvider).toBeDefined();
      expect(queueProvider!.useValue).toBe(bull);
    });

    it('should set global to false when specified', () => {
      const mod = NotificationModule.forRoot({ providers: {}, global: false });
      expect(mod.global).toBe(false);
    });
  });

  describe('forRootAsync()', () => {
    it('should return a dynamic module with async options provider', () => {
      const mod = NotificationModule.forRootAsync({
        useFactory: () => ({ providers: {} }),
        inject: [],
      });

      expect(mod.module).toBe(NotificationModule);
      expect(mod.exports).toContain(NotificationService);

      const optionsProvider = (mod.providers ?? []).find(
        (p: any) => p.provide === NOTIFICATION_MODULE_OPTIONS,
      );
      expect(optionsProvider).toBeDefined();
      expect(typeof optionsProvider!.useFactory).toBe('function');
    });

    it('should pass imports through', () => {
      const mod = NotificationModule.forRootAsync({
        useFactory: () => ({ providers: {} }),
        inject: [],
        imports: [],
      });
      expect(mod.imports).toEqual([]);
    });

    it('should create module with async store and queue providers', () => {
      const queue = { add: jest.fn() };
      const store = {
        save: jest.fn(),
        findById: jest.fn(),
        findByChannel: jest.fn(),
        updateStatus: jest.fn(),
      };

      const mod = NotificationModule.forRootAsync({
        useFactory: () => ({
          providers: {},
          storage: { enabled: true, store },
          queue: { enabled: true, bull: queue },
        }),
        inject: [],
      });

      const storeProvider = (mod.providers ?? []).find(
        (p: any) => p.provide === NOTIFICATION_STORE,
      );
      const queueProvider = (mod.providers ?? []).find(
        (p: any) => p.provide === NOTIFICATION_QUEUE,
      );

      expect(storeProvider).toBeDefined();
      expect(queueProvider).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('forRoot should make NotificationService available', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [NotificationModule.forRoot({ providers: {} })],
      }).compile();

      const service = moduleRef.get(NotificationService);
      expect(service).toBeInstanceOf(NotificationService);
    });

    it('forRootAsync should make NotificationService available', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NotificationModule.forRootAsync({
            useFactory: () => ({ providers: {} }),
            inject: [],
          }),
        ],
      }).compile();

      const service = moduleRef.get(NotificationService);
      expect(service).toBeInstanceOf(NotificationService);
    });
  });
});
