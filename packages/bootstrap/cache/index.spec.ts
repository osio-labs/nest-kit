import type { ConfigService } from '@nestjs/config';

jest.mock('node:module', () => {
  const installed = new Set(['cacheable', '@keyv/redis', '@keyv/valkey']);
  return {
    createRequire: () => ({
      resolve: (id: string) => {
        if (installed.has(id)) return id;
        throw new Error(`Cannot find module '${id}'`);
      },
    }),
  };
});

import { configCache } from './index.js';

/* ---------- configCache (sync, reads process.env) ---------- */

describe('configCache', () => {
  const OLD_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it('should return memory store by default', () => {
    const cfg = configCache();

    expect(cfg.type).toBe('memory');
    expect(cfg.ttl).toBe(60);
    expect(cfg.max).toBe(100);
    expect(cfg.isGlobal).toBe(false);
  });

  it('should respect CACHE_STORE env var', () => {
    process.env.CACHE_STORE = 'redis';

    const cfg = configCache();

    expect(cfg.type).toBe('redis');
    expect(cfg.url).toContain('redis://localhost:6379');
  });

  it('should read REDIS_URL env var', () => {
    process.env.CACHE_STORE = 'redis';
    process.env.REDIS_URL = 'redis://user:pass@redis.example.com:6380';
    process.env.REDIS_KEY_PREFIX = 'myapp:';

    const cfg = configCache();

    expect(cfg.url).toBe('redis://user:pass@redis.example.com:6380');
    expect(cfg.keyPrefix).toBe('myapp:');
  });

  it('should read VALKEY_URL env var', () => {
    process.env.CACHE_STORE = 'valkey';
    process.env.VALKEY_URL = 'redis://valkey.example.com:6381';

    const cfg = configCache();

    expect(cfg.url).toBe('redis://valkey.example.com:6381');
  });

  it('should enable TLS when RDS_CACHE_ENABLED is true', () => {
    process.env.CACHE_STORE = 'redis';
    process.env.RDS_CACHE_ENABLED = 'true';

    const cfg = configCache();

    expect(cfg.url).toContain('redis://');
    expect(cfg.rdsEnabled).toBe(true);
  });

  it('should override env with options', () => {
    process.env.CACHE_STORE = 'redis';
    process.env.REDIS_URL = 'redis://env.host:6379';

    const cfg = configCache({
      stores: [{ type: 'redis', url: 'redis://opt.host:6379' }],
    });

    expect(cfg.url).toBe('redis://opt.host:6379');
  });

  it('should return multiple stores array', () => {
    process.env.CACHE_STORE = 'memory,redis';

    const cfg = configCache();

    const stores: unknown = cfg.stores;
    expect(Array.isArray(stores)).toBe(true);
    expect(stores as Array<Record<string, unknown>>).toHaveLength(2);
    expect((stores as Array<Record<string, unknown>>)[0].type).toBe('memory');
    expect((stores as Array<Record<string, unknown>>)[1].type).toBe('redis');
  });

  it('should flatten single store', () => {
    const cfg = configCache({
      stores: [{ type: 'memory', max: 50, ttl: 30 }],
    });

    expect(cfg.type).toBe('memory');
    expect(cfg.max).toBe(50);
    expect(cfg.ttl).toBe(30);
    expect(cfg.stores).toBeUndefined();
  });

  it('should respect CACHE_TTL and CACHE_MAX env vars', () => {
    process.env.CACHE_TTL = '300';
    process.env.CACHE_MAX = '500';

    const cfg = configCache();

    expect(cfg.ttl).toBe(300);
    expect(cfg.max).toBe(500);
  });

  it('should set isGlobal from env', () => {
    process.env.CACHE_IS_GLOBAL = 'true';

    const cfg = configCache();

    expect(cfg.isGlobal).toBe(true);
  });

  it('should use store-level ttl over global', () => {
    const cfg = configCache({
      ttl: 120,
      stores: [{ type: 'memory', ttl: 60 }],
    });

    expect(cfg.ttl).toBe(60);
  });

  it('should build Keyv instances when keyv is provided', () => {
    let capturedTtl: unknown;

    const KeyvMock = class {
      constructor(opts: Record<string, unknown>) {
        capturedTtl = opts.ttl;
      }
    };

    const MemoryAdapterMock = class {};

    const cfg = configCache({
      keyv: KeyvMock as never,
      stores: [{ type: 'memory', adapter: MemoryAdapterMock, max: 200 }],
    });

    expect(cfg.store).toBeInstanceOf(KeyvMock);
    expect(capturedTtl).toBe(60000); // 60s → ms
  });

  it('should build Redis Keyv instance with adapter', () => {
    let adapterUrl: string | undefined;

    const KeyvMock = class {
      store: unknown;
      ttl: number;
      constructor(opts: Record<string, unknown>) {
        this.store = opts.store;
        this.ttl = opts.ttl as number;
      }
    };

    const RedisAdapterMock = class {
      constructor(url: string) {
        adapterUrl = url;
      }
    };

    const cfg = configCache({
      keyv: KeyvMock as never,
      stores: [{ type: 'redis', adapter: RedisAdapterMock as never }],
    });

    expect(cfg.store).toBeInstanceOf(KeyvMock);
    expect(adapterUrl).toContain('localhost:6379');
  });

  it('should throw when adapter is missing for redis', () => {
    const KeyvMock = class {};
    expect(() =>
      configCache({
        keyv: KeyvMock as never,
        stores: [{ type: 'valkey' }],
      }),
    ).toThrow('requires an adapter');
  });

  describe('named stores', () => {
    it('should read CACHE_{NAME}_URL env var', () => {
      process.env.CACHE_STORE = 'redis';
      process.env.CACHE_SESSIONS_URL = 'redis://sessions.local:6379';

      const cfg = configCache({
        stores: [{ type: 'redis', name: 'sessions' }],
      });

      expect(cfg.url).toBe('redis://sessions.local:6379');
    });

    it('should fall back to REDIS_URL when no name matches', () => {
      process.env.CACHE_STORE = 'redis';
      process.env.REDIS_URL = 'redis://fallback:6379';

      const cfg = configCache({
        stores: [{ type: 'redis', name: 'sessions' }],
      });

      expect(cfg.url).toBe('redis://fallback:6379');
    });

    it('should prefer CACHE_{NAME} over generic env vars', () => {
      process.env.CACHE_STORE = 'redis';
      process.env.CACHE_DATA_URL = 'redis://named:6379';
      process.env.REDIS_URL = 'redis://generic:6379';

      const cfg = configCache({
        stores: [{ type: 'redis', name: 'data' }],
      });

      expect(cfg.url).toBe('redis://named:6379');
    });

    it('should read CACHE_{NAME}_TTL and CACHE_{NAME}_MAX', () => {
      process.env.CACHE_SESSIONS_TTL = '300';
      process.env.CACHE_SESSIONS_MAX = '500';
      process.env.CACHE_TTL = '60';
      process.env.CACHE_MAX = '100';

      const cfg = configCache({
        stores: [{ type: 'memory', name: 'sessions' }],
      });

      expect(cfg.ttl).toBe(300);
      expect(cfg.max).toBe(500);
    });

    it('should include name in raw output', () => {
      const cfg = configCache({
        stores: [{ type: 'redis', name: 'sessions' }],
      });

      expect(cfg.name).toBe('sessions');
    });

    it('should include name in Keyv store output', () => {
      const KeyvMock = class {};

      const cfg = configCache({
        keyv: KeyvMock as never,
        stores: [{ type: 'memory', name: 'session-cache', adapter: class {} }],
      });

      expect(cfg.store).toBeDefined();
      expect(cfg.name).toBe('session-cache');
    });

    it('should pass name to store entries in multi-store Keyv output', () => {
      const KeyvMock = class {};
      const MemAdapter = class {};
      const RedisAdapter = class {};

      const cfg = configCache({
        keyv: KeyvMock as never,
        stores: [
          { type: 'memory', name: 'mem', adapter: MemAdapter },
          { type: 'redis', name: 'rd', adapter: RedisAdapter },
        ],
      });

      const stores = cfg.stores as Array<Record<string, unknown>>;
      expect(stores).toHaveLength(2);
      expect(stores[0].name).toBe('mem');
      expect(stores[1].name).toBe('rd');
    });
  });
});

/* ---------- configCache with ConfigService ---------- */

describe('configCache with ConfigService', () => {
  function mockCs(map: Record<string, unknown>): ConfigService {
    return {
      get: jest.fn((key: string, def?: unknown) => (key in map ? map[key] : def)),
    } as unknown as ConfigService;
  }

  it('should return memory store by default', () => {
    const cs = mockCs({});
    const cfg = configCache(undefined, cs);

    expect(cfg.type).toBe('memory');
    expect(cfg.ttl).toBe(60);
    expect(cfg.max).toBe(100);
  });

  it('should read from ConfigService', () => {
    const cs = mockCs({
      CACHE_STORE: 'redis',
      REDIS_URL: 'redis://cs.host:6382',
      CACHE_TTL: 180,
    });

    const cfg = configCache(undefined, cs);

    expect(cfg.url).toBe('redis://cs.host:6382');
    expect(cfg.ttl).toBe(180);
  });

  it('should respect options over ConfigService', () => {
    const cs = mockCs({ REDIS_URL: 'redis://cs.host:6379' });

    const cfg = configCache(
      {
        stores: [{ type: 'redis', url: 'redis://opt.host:6379' }],
      },
      cs,
    );

    expect(cfg.url).toBe('redis://opt.host:6379');
  });

  it('should build Keyv instances when keyv is provided', () => {
    const cs = mockCs({});
    let captured: unknown;

    const KeyvMock = class {
      constructor(opts: Record<string, unknown>) {
        captured = opts;
      }
    };

    const cfg = configCache(
      {
        keyv: KeyvMock as never,
        stores: [{ type: 'memory' }],
      },
      cs,
    );

    expect(cfg.store).toBeInstanceOf(KeyvMock);
    expect((captured as Record<string, unknown>).ttl).toBe(60000);
  });
});
