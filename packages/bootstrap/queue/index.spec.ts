import { ConfigService } from '@nestjs/config';
import { configQueue } from './index';

describe('configQueue', () => {
  const OLD_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it('should return default connection', () => {
    const cfg = configQueue();

    expect(cfg.connection).toEqual({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
  });

  it('should include auto-removal defaults', () => {
    const cfg = configQueue();

    expect(cfg.defaultJobOptions).toMatchObject({
      removeOnComplete: true,
      removeOnFail: true,
    });
  });

  it('should respect QUEUE_HOST and QUEUE_PORT', () => {
    process.env.QUEUE_HOST = 'redis.example.com';
    process.env.QUEUE_PORT = '6380';

    const cfg = configQueue();

    expect(cfg.connection).toMatchObject({ host: 'redis.example.com', port: 6380 });
  });

  it('should use QUEUE_URL over individual settings', () => {
    process.env.QUEUE_URL = 'redis://user:pass@external.com:6381/2';
    process.env.QUEUE_HOST = 'ignored.com';

    const cfg = configQueue();

    expect(cfg.connection).toEqual({
      url: 'redis://user:pass@external.com:6381/2',
    });
  });

  it('should accept VALKEY_URL', () => {
    process.env.VALKEY_URL = 'valkey://valkey.internal:6380';

    const cfg = configQueue();

    expect(cfg.connection).toEqual({
      url: 'valkey://valkey.internal:6380',
    });
  });

  it('should prefer QUEUE_URL over VALKEY_URL', () => {
    process.env.QUEUE_URL = 'redis://queue:6379';
    process.env.VALKEY_URL = 'valkey://valkey:6379';

    const cfg = configQueue();

    expect(cfg.connection).toMatchObject({ url: 'redis://queue:6379' });
  });

  it('should fall back to REDIS_URL', () => {
    process.env.REDIS_URL = 'redis://fallback:6379';

    const cfg = configQueue();

    expect(cfg.connection).toEqual({
      url: 'redis://fallback:6379',
    });
  });

  it('should respect QUEUE_PASSWORD', () => {
    process.env.QUEUE_PASSWORD = 'secret';

    const cfg = configQueue();

    expect(cfg.connection).toMatchObject({ password: 'secret' });
  });

  it('should respect QUEUE_USERNAME and QUEUE_DB', () => {
    process.env.QUEUE_USERNAME = 'admin';
    process.env.QUEUE_DB = '3';

    const cfg = configQueue();

    expect(cfg.connection).toMatchObject({ username: 'admin', db: 3 });
  });

  it('should enable TLS when QUEUE_TLS is true', () => {
    process.env.QUEUE_TLS = 'true';

    const cfg = configQueue();

    expect(cfg.connection).toMatchObject({ tls: {} });
  });

  it('should include prefix', () => {
    process.env.QUEUE_PREFIX = '{myapp}';

    const cfg = configQueue();

    expect(cfg.prefix).toBe('{myapp}');
  });

  it('should respect QUEUE_IS_GLOBAL', () => {
    process.env.QUEUE_IS_GLOBAL = 'true';

    const cfg = configQueue();

    expect(cfg.isGlobal).toBe(true);
  });

  it('should parse default job options from env', () => {
    process.env.QUEUE_DEFAULT_ATTEMPTS = '5';
    process.env.QUEUE_DEFAULT_BACKOFF_TYPE = 'exponential';
    process.env.QUEUE_DEFAULT_BACKOFF_DELAY = '2000';

    const cfg = configQueue();

    expect(cfg.defaultJobOptions).toMatchObject({
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  });

  it('should always include auto-removal defaults in defaultJobOptions', () => {
    const cfg = configQueue();

    expect(cfg.defaultJobOptions).toEqual({
      removeOnComplete: true,
      removeOnFail: true,
    });
  });

  it('should allow opting out of auto-removal', () => {
    const cfg = configQueue({
      defaultJobOptions: {
        removeOnComplete: false,
        removeOnFail: { age: 86400 },
      },
    });

    expect(cfg.defaultJobOptions).toMatchObject({
      removeOnComplete: false,
      removeOnFail: { age: 86400 },
    });
  });

  it('should pass queues in raw output', () => {
    const cfg = configQueue({
      queues: [{ name: 'email' }, { name: 'notifications' }],
    });

    const qs = cfg.queues as Array<Record<string, unknown>>;
    expect(qs).toHaveLength(2);
    expect(qs[0].name).toBe('email');
    expect(qs[1].name).toBe('notifications');
  });

  it('should include connection options from config', () => {
    const cfg = configQueue({
      connection: {
        host: 'custom.io',
        port: 9999,
        db: 5,
        maxRetriesPerRequest: 10,
        enableReadyCheck: false,
      },
    });

    expect(cfg.connection).toMatchObject({
      host: 'custom.io',
      port: 9999,
      db: 5,
      maxRetriesPerRequest: 10,
      enableReadyCheck: false,
    });
  });

  it('should include prefix from config', () => {
    const cfg = configQueue({ prefix: '{app}' });

    expect(cfg.prefix).toBe('{app}');
  });

  it('should include defaultJobOptions from config', () => {
    const cfg = configQueue({
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400 },
        delay: 5000,
        priority: 10,
        timeout: 30000,
        ttl: 60000,
        stackTraceLimit: 50,
        lifo: true,
      },
    });

    expect(cfg.defaultJobOptions).toMatchObject({
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 3600, count: 100 },
      removeOnFail: { age: 86400 },
      delay: 5000,
      priority: 10,
      timeout: 30000,
      ttl: 60000,
      stackTraceLimit: 50,
      lifo: true,
    });
  });

  describe('with Queue class', () => {
    it('should build Queue instances', () => {
      const QueueMock = class {
        name: string;
        opts: Record<string, unknown>;
        constructor(name: string, opts: Record<string, unknown>) {
          this.name = name;
          this.opts = opts;
        }
      };

      const cfg = configQueue({
        Queue: QueueMock as never,
        queues: [{ name: 'email' }],
      });

      expect(cfg.queue).toBeInstanceOf(QueueMock);
      expect(cfg.name).toBe('email');
      expect(cfg.connection).toBeDefined();
    });

    it('should build forRoot config with connection and defaults', () => {
      const QueueMock = class {};

      const cfg = configQueue({
        Queue: QueueMock as never,
      });

      expect(cfg.connection).toBeDefined();
      expect(cfg.defaultJobOptions).toMatchObject({
        removeOnComplete: true,
        removeOnFail: true,
      });
      expect(cfg.prefix).toBeUndefined();
    });

    it('should build multiple Queue instances', () => {
      const calls: Array<{ name: string }> = [];
      const QueueMock = class {
        constructor(name: string) {
          calls.push({ name });
        }
      };

      configQueue({
        Queue: QueueMock as never,
        queues: [{ name: 'email' }, { name: 'pdf' }, { name: 'notifications' }],
      });

      expect(calls).toHaveLength(3);
      expect(calls[0].name).toBe('email');
      expect(calls[1].name).toBe('pdf');
      expect(calls[2].name).toBe('notifications');
    });

    it('should produce stores array with multiple queues', () => {
      const QueueMock = class {};

      const cfg = configQueue({
        Queue: QueueMock as never,
        queues: [{ name: 'a' }, { name: 'b' }],
      });

      const stores = cfg.queues as Array<Record<string, unknown>>;
      expect(stores).toHaveLength(2);
      expect(stores[0].name).toBe('a');
      expect(stores[1].name).toBe('b');
    });

    it('should build FlowProducer when class is provided', () => {
      const QueueMock = class {};
      let fpInstance: unknown;
      const FlowProducerMock = class {
        constructor(opts: Record<string, unknown>) {
          fpInstance = opts;
        }
      } as never;

      const cfg = configQueue({
        Queue: QueueMock as never,
        FlowProducer: FlowProducerMock,
        queues: [{ name: 'flow-queue' }],
      });

      expect(cfg.flowProducer).toBeDefined();
    });

    it('should prefix queues with config prefix', () => {
      const QueueMock = class {};
      const cfg = configQueue({
        Queue: QueueMock as never,
        prefix: '{app}',
        queues: [{ name: 'email' }],
      });

      expect(cfg.prefix).toBe('{app}');
    });

    it('should pass per-queue options', () => {
      const QueueMock = class {
        name: string;
        opts: Record<string, unknown>;
        constructor(name: string, opts: Record<string, unknown>) {
          this.name = name;
          this.opts = opts;
        }
      };

      const cfg = configQueue({
        Queue: QueueMock as never,
        queues: [
          {
            name: 'priority',
            defaultJobOptions: { priority: 1, attempts: 3 },
            prefix: '{high}',
          },
        ],
      });

      expect(cfg.name).toBe('priority');
    });
  });

  describe('connection overrides', () => {
    it('should merge TLS from options with QUEUE_URL', () => {
      const cfg = configQueue({
        connection: {
          tls: { rejectUnauthorized: false },
        },
      });

      expect(cfg.connection).toMatchObject({
        host: 'localhost',
        port: 6379,
        tls: { rejectUnauthorized: false },
      });
    });
  });

  describe('maxRetriesPerRequest and enableReadyCheck', () => {
    it('should set maxRetriesPerRequest from env', () => {
      process.env.QUEUE_MAX_RETRIES_PER_REQUEST = '3';

      const cfg = configQueue();

      expect(cfg.connection).toMatchObject({ maxRetriesPerRequest: 3 });
    });

    it('should set enableReadyCheck from env', () => {
      process.env.QUEUE_ENABLE_READY_CHECK = 'false';

      const cfg = configQueue();

      expect(cfg.connection).toMatchObject({ enableReadyCheck: false });
    });
  });
});

describe('configQueue (with ConfigService)', () => {
  function mockCs(map: Record<string, unknown>): ConfigService {
    return {
      get: jest.fn((key: string, def?: unknown) => (key in map ? map[key] : def)),
    } as unknown as ConfigService;
  }

  it('should return default connection with auto-removal defaults', () => {
    const cs = mockCs({});
    const cfg = configQueue(cs);

    expect(cfg.connection).toMatchObject({ host: 'localhost', port: 6379 });
    expect(cfg.defaultJobOptions).toMatchObject({
      removeOnComplete: true,
      removeOnFail: true,
    });
  });

  it('should read from ConfigService', () => {
    const cs = mockCs({
      QUEUE_HOST: 'config.host',
      QUEUE_PORT: 6382,
      QUEUE_PASSWORD: 'cfg-pass',
      QUEUE_DB: 1,
    });

    const cfg = configQueue(cs);

    expect(cfg.connection).toMatchObject({
      host: 'config.host',
      port: 6382,
      password: 'cfg-pass',
      db: 1,
    });
  });

  it('should read QUEUE_URL from ConfigService', () => {
    const cs = mockCs({
      QUEUE_URL: 'redis://cs:6379',
    });

    const cfg = configQueue(cs);

    expect(cfg.connection).toMatchObject({
      url: 'redis://cs:6379',
    });
  });

  it('should read VALKEY_URL from ConfigService', () => {
    const cs = mockCs({
      VALKEY_URL: 'valkey://cs:6380',
    });

    const cfg = configQueue(cs);

    expect(cfg.connection).toMatchObject({
      url: 'valkey://cs:6380',
    });
  });

  it('should respect options over ConfigService', () => {
    const cs = mockCs({ QUEUE_HOST: 'cs.host' });

    const cfg = configQueue(cs, {
      connection: { host: 'opt.host' },
    });

    expect(cfg.connection).toMatchObject({ host: 'opt.host' });
  });

  it('should build Queue instances when Queue is provided', () => {
    const cs = mockCs({});
    const QueueMock = class {
      name: string;
      constructor(name: string) {
        this.name = name;
      }
    };

    const cfg = configQueue(cs, {
      Queue: QueueMock as never,
      queues: [{ name: 'email' }],
    });

    expect(cfg.queue).toBeInstanceOf(QueueMock);
    expect(cfg.name).toBe('email');
  });

  it('should read prefix from env', () => {
    const cs = mockCs({ QUEUE_PREFIX: '{cs-prefix}' });

    const cfg = configQueue(cs);

    expect(cfg.prefix).toBe('{cs-prefix}');
  });

  it('should read isGlobal from env', () => {
    const cs = mockCs({ QUEUE_IS_GLOBAL: true });

    const cfg = configQueue(cs);

    expect(cfg.isGlobal).toBe(true);
  });

  it('should read default job options from env', () => {
    const cs = mockCs({
      QUEUE_DEFAULT_ATTEMPTS: 3,
      QUEUE_DEFAULT_BACKOFF_DELAY: 1500,
    });

    const cfg = configQueue(cs);

    expect(cfg.defaultJobOptions).toMatchObject({
      attempts: 3,
      backoff: { type: 'fixed', delay: 1500 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  });

  it('should allow opting out of auto-removal via options', () => {
    const cs = mockCs({});

    const cfg = configQueue(cs, {
      defaultJobOptions: { removeOnComplete: false, removeOnFail: false },
    });

    expect(cfg.defaultJobOptions).toMatchObject({
      removeOnComplete: false,
      removeOnFail: false,
    });
  });
});
