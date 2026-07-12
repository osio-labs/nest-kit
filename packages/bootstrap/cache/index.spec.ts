import type { ConfigService } from '@nestjs/config';

class MockKeyvCacheableMemory {
  opts: Record<string, unknown>;
  constructor(opts: Record<string, unknown>) {
    this.opts = opts;
  }
}

class MockKeyvRedis {
  url: string;
  opts: Record<string, unknown>;
  constructor(url: string, opts: Record<string, unknown>) {
    this.url = url;
    this.opts = opts;
  }
}

class MockKeyvValkey {
  url: string;
  opts: Record<string, unknown>;
  constructor(url: string, opts: Record<string, unknown>) {
    this.url = url;
    this.opts = opts;
  }
}

class MockKeyv {
  opts: Record<string, unknown>;
  constructor(opts: Record<string, unknown>) {
    this.opts = opts;
  }
}

jest.mock('node:module', () => {
  const installed = new Set(['cacheable', '@keyv/redis', '@keyv/valkey', 'keyv']);
  const mods: Record<string, unknown> = {
    cacheable: { KeyvCacheableMemory: MockKeyvCacheableMemory },
    '@keyv/redis': { default: MockKeyvRedis },
    '@keyv/valkey': { default: MockKeyvValkey },
    keyv: { default: MockKeyv },
  };
  return {
    createRequire: () => {
      const req = (id: string) => mods[id];
      req.resolve = (id: string) => {
        if (installed.has(id)) return id;
        throw new Error(`Cannot find module '${id}'`);
      };
      return req;
    },
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
    const stores = cfg.stores as MockKeyv[];

    expect(stores).toHaveLength(1);
    expect(stores[0]).toBeInstanceOf(MockKeyv);
    expect(stores[0].opts.store).toBeInstanceOf(MockKeyvCacheableMemory);
    expect((stores[0].opts.store as MockKeyvCacheableMemory).opts.lruSize).toBe(100);
    expect(stores[0].opts.ttl).toBe(60000);
    expect(cfg.isGlobal).toBe(false);
  });

  it('should detect valkey from CACHE_URL', () => {
    process.env.CACHE_URL = 'redis://localhost:6379/0';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect(stores[0].opts.store).toBeInstanceOf(MockKeyvValkey);
    expect((stores[0].opts.store as MockKeyvValkey).url).toBe('redis://localhost:6379/0');
  });

  it('should detect memory from empty CACHE_URL segment', () => {
    process.env.CACHE_URL = '|redis://localhost:6379/0';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect(stores).toHaveLength(2);
    expect(stores[0].opts.store).toBeInstanceOf(MockKeyvCacheableMemory);
    expect(stores[1].opts.store).toBeInstanceOf(MockKeyvValkey);
  });

  it('should override valkey to redis via CACHE_TYPE', () => {
    process.env.CACHE_URL = 'redis://localhost:6379/0';
    process.env.CACHE_TYPE = 'redis';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect(stores[0].opts.store).toBeInstanceOf(MockKeyvRedis);
    expect((stores[0].opts.store as MockKeyvRedis).url).toBe('redis://localhost:6379/0');
  });

  it('should not override memory to redis via CACHE_TYPE', () => {
    process.env.CACHE_URL = '|redis://localhost:6379/0';
    process.env.CACHE_TYPE = 'redis|redis';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect(stores[0].opts.store).toBeInstanceOf(MockKeyvCacheableMemory);
    expect(stores[1].opts.store).toBeInstanceOf(MockKeyvRedis);
  });

  it('should detect RDS from rediss:// protocol', () => {
    process.env.CACHE_URL = 'rediss://redis.example.com:6380';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    const adapter = stores[0].opts.store as MockKeyvValkey;
    expect(adapter.url).toBe('rediss://redis.example.com:6380');
    expect(adapter.opts.socket).toEqual({ tls: true });
  });

  it('should not enable RDS for redis:// protocol', () => {
    process.env.CACHE_URL = 'redis://redis.example.com:6379';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    const adapter = stores[0].opts.store as MockKeyvValkey;
    expect(adapter.opts.socket).toBeUndefined();
  });

  it('should read CACHE_PREFIX', () => {
    process.env.CACHE_URL = 'redis://localhost:6379/0';
    process.env.CACHE_PREFIX = 'myapp:';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    const adapter = stores[0].opts.store as MockKeyvValkey;
    expect(adapter.opts.keyPrefix).toBe('myapp:');
  });

  it('should return multiple stores from CACHE_URL', () => {
    process.env.CACHE_URL = '|redis://localhost:6379/0';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect(stores).toHaveLength(2);
    expect(stores[0].opts.store).toBeInstanceOf(MockKeyvCacheableMemory);
    expect(stores[1].opts.store).toBeInstanceOf(MockKeyvValkey);
  });

  it('should always return stores array', () => {
    process.env.CACHE_URL = '';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect(stores).toHaveLength(1);
    expect(stores[0].opts.store).toBeInstanceOf(MockKeyvCacheableMemory);
  });

  it('should respect CACHE_TTL and CACHE_MAX env vars', () => {
    process.env.CACHE_TTL = '300';
    process.env.CACHE_MAX = '500';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect(cfg.ttl).toBe(300);
    expect((stores[0].opts.store as MockKeyvCacheableMemory).opts.lruSize).toBe(500);
  });

  it('should set isGlobal from env', () => {
    process.env.CACHE_IS_GLOBAL = 'true';

    const cfg = configCache();

    expect(cfg.isGlobal).toBe(true);
  });

  it('should build Keyv instances when keyv is provided', () => {
    let capturedTtl: unknown;

    const KeyvMock = class {
      constructor(opts: Record<string, unknown>) {
        capturedTtl = opts.ttl;
      }
    };

    const cfg = configCache({ keyv: KeyvMock as never });
    const stores = cfg.stores as Array<{ opts: Record<string, unknown> }>;

    expect(stores[0]).toBeInstanceOf(KeyvMock);
    expect(capturedTtl).toBe(60000);
  });

  it('should build Redis Keyv instance with auto-loaded adapter', () => {
    process.env.CACHE_URL = 'redis://localhost:6379/0';
    process.env.CACHE_TYPE = 'redis';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect(stores[0]).toBeInstanceOf(MockKeyv);
    expect(stores[0].opts.store).toBeInstanceOf(MockKeyvRedis);
  });

  it('should build Valkey Keyv instance with auto-loaded adapter', () => {
    process.env.CACHE_URL = 'redis://localhost:6379/0';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect(stores[0].opts.store).toBeInstanceOf(MockKeyvValkey);
  });

  it('should build Memory Keyv instance with auto-loaded adapter', () => {
    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect(stores[0].opts.store).toBeInstanceOf(MockKeyvCacheableMemory);
  });

  it('should parse pipe-separated CACHE_URL', () => {
    process.env.CACHE_URL = '|redis://host1:6379/0|redis://host2:6379/0';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect(stores).toHaveLength(3);
    expect(stores[0].opts.store).toBeInstanceOf(MockKeyvCacheableMemory);
    expect((stores[1].opts.store as MockKeyvValkey).url).toBe('redis://host1:6379/0');
    expect((stores[2].opts.store as MockKeyvValkey).url).toBe('redis://host2:6379/0');
  });

  it('should parse pipe-separated CACHE_PREFIX', () => {
    process.env.CACHE_URL = 'redis://host1:6379/0|redis://host2:6379/0';
    process.env.CACHE_PREFIX = 'prefix1:|prefix2:';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect((stores[0].opts.store as MockKeyvValkey).opts.keyPrefix).toBe('prefix1:');
    expect((stores[1].opts.store as MockKeyvValkey).opts.keyPrefix).toBe('prefix2:');
  });

  it('should detect RDS per-store from rediss:// in CACHE_URL', () => {
    process.env.CACHE_URL = 'redis://normal:6379/0|rediss://tls:6380/0';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect((stores[0].opts.store as MockKeyvValkey).opts.socket).toBeUndefined();
    expect((stores[1].opts.store as MockKeyvValkey).opts.socket).toEqual({ tls: true });
  });

  it('should detect RDS for valkey from rediss:// protocol', () => {
    process.env.CACHE_URL = 'rediss://valkey.example.com:6379/0';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect(stores[0].opts.store).toBeInstanceOf(MockKeyvValkey);
    expect((stores[0].opts.store as MockKeyvValkey).url).toBe('rediss://valkey.example.com:6379/0');
    expect((stores[0].opts.store as MockKeyvValkey).opts.socket).toEqual({ tls: true });
  });

  it('should override valkey to redis with CACHE_TYPE', () => {
    process.env.CACHE_URL = 'redis://host1:6379/0|redis://host2:6379/0';
    process.env.CACHE_TYPE = 'redis|redis';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect(stores[0].opts.store).toBeInstanceOf(MockKeyvRedis);
    expect(stores[1].opts.store).toBeInstanceOf(MockKeyvRedis);
  });

  it('should keep valkey when CACHE_TYPE has empty segment', () => {
    process.env.CACHE_URL = 'redis://host1:6379/0|redis://host2:6379/0';
    process.env.CACHE_TYPE = '|redis';

    const cfg = configCache();
    const stores = cfg.stores as MockKeyv[];

    expect(stores[0].opts.store).toBeInstanceOf(MockKeyvValkey);
    expect(stores[1].opts.store).toBeInstanceOf(MockKeyvRedis);
  });

  it('should throw when CACHE_TYPE has more entries than CACHE_URL', () => {
    process.env.CACHE_URL = 'redis://host:6379/0';
    process.env.CACHE_TYPE = 'redis|redis';

    expect(() => configCache()).toThrow('CACHE_TYPE has 2 entries but CACHE_URL only has 1');
  });

  it('should throw when CACHE_PREFIX has more entries than CACHE_URL', () => {
    process.env.CACHE_URL = 'redis://host:6379/0';
    process.env.CACHE_PREFIX = 'a:|b:';

    expect(() => configCache()).toThrow('CACHE_PREFIX has 2 entries but CACHE_URL only has 1');
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
    const stores = cfg.stores as MockKeyv[];

    expect(stores[0].opts.store).toBeInstanceOf(MockKeyvCacheableMemory);
    expect((stores[0].opts.store as MockKeyvCacheableMemory).opts.lruSize).toBe(100);
    expect(stores[0].opts.ttl).toBe(60000);
  });

  it('should read from ConfigService', () => {
    const cs = mockCs({
      CACHE_URL: 'redis://cs.host:6382',
      CACHE_TTL: 180,
    });

    const cfg = configCache(undefined, cs);
    const stores = cfg.stores as MockKeyv[];

    expect((stores[0].opts.store as MockKeyvValkey).url).toBe('redis://cs.host:6382');
    expect(cfg.ttl).toBe(180);
  });

  it('should build Keyv instances when keyv is provided', () => {
    const cs = mockCs({});
    let captured: unknown;

    const KeyvMock = class {
      constructor(opts: Record<string, unknown>) {
        captured = opts;
      }
    };

    const cfg = configCache({ keyv: KeyvMock as never }, cs);
    const stores = cfg.stores as Array<{ opts: Record<string, unknown> }>;

    expect(stores[0]).toBeInstanceOf(KeyvMock);
    expect((captured as Record<string, unknown>).ttl).toBe(60000);
  });
});
