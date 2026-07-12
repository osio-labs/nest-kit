import type { ConfigService } from '@nestjs/config';
import { configQueue } from './index.js';

describe('configQueue', () => {
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    process.env.QUEUE_URL = 'redis://localhost:6379';
  });

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it('should throw when QUEUE_URL is not set', () => {
    delete process.env.QUEUE_URL;

    expect(() => configQueue()).toThrow('QUEUE_URL is required');
  });

  it('should include auto-removal defaults', () => {
    const cfg = configQueue();

    expect(cfg.defaultJobOptions).toMatchObject({
      removeOnComplete: true,
      removeOnFail: true,
    });
  });

  it('should use QUEUE_URL for connection', () => {
    process.env.QUEUE_URL = 'redis://user:pass@external.com:6381/2';

    const cfg = configQueue();

    expect(cfg.connection).toEqual({
      url: 'redis://user:pass@external.com:6381/2',
    });
  });

  it('should include prefix from env', () => {
    process.env.QUEUE_PREFIX = '{myapp}';

    const cfg = configQueue();

    expect(cfg.prefix).toBe('{myapp}');
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

  it('should set isGlobal from options', () => {
    const cfg = configQueue({ isGlobal: true });

    expect(cfg.isGlobal).toBe(true);
  });
});

describe('configQueue with ConfigService', () => {
  function mockCs(map: Record<string, unknown>): ConfigService {
    return {
      get: jest.fn((key: string, def?: unknown) => (key in map ? map[key] : def)),
    } as unknown as ConfigService;
  }

  it('should throw when QUEUE_URL is not set', () => {
    delete process.env.QUEUE_URL;
    const cs = mockCs({});

    expect(() => configQueue(undefined, cs)).toThrow('QUEUE_URL is required');
  });

  it('should read QUEUE_URL from ConfigService', () => {
    const cs = mockCs({ QUEUE_URL: 'redis://cs:6379' });

    const cfg = configQueue(undefined, cs);

    expect(cfg.connection).toMatchObject({
      url: 'redis://cs:6379',
    });
  });

  it('should read prefix from env via ConfigService', () => {
    const cs = mockCs({ QUEUE_URL: 'redis://cs:6379', QUEUE_PREFIX: '{cs-prefix}' });

    const cfg = configQueue(undefined, cs);

    expect(cfg.prefix).toBe('{cs-prefix}');
  });
});
