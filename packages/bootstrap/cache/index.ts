/**
 * @os.io/nest-kit/bootstrap/cache
 *
 * Cache module configuration bootstrapper for NestJS applications.
 * Supports memory, Redis, Valkey, and multi-tier caching.
 *
 * @module
 * @packageDocumentation
 */

import type { Getter } from '../with-config.js';
import { withConfig } from '../with-config.js';

/** Per-store configuration. */
export interface CacheStoreConfig {
  /** Store type */
  type: 'memory' | 'redis' | 'valkey';

  /**
   * Optional name to distinguish this store.
   *
   * When set, the bootstrapper also reads `CACHE_{NAME}_URL`,
   * `CACHE_{NAME}_KEY_PREFIX`, `CACHE_{NAME}_TTL`, and
   * `CACHE_{NAME}_MAX` environment variables (with `NAME`
   * uppercased). Named env vars take priority over the
   * generic `REDIS_*` / `VALKEY_*` / `CACHE_*` variables.
   *
   * @example
   * ```ts
   * stores: [
   *   { type: 'redis', name: 'sessions' },
   *   { type: 'redis', name: 'data' },
   * ]
   * // Also reads: CACHE_SESSIONS_URL, CACHE_DATA_URL
   * ```
   */
  name?: string;

  /**
   * Keyv adapter constructor.
   *
   * @example
   * ```ts
   * import { KeyvCacheableMemory } from 'cacheable';
   * import KeyvRedis from '@keyv/redis';
   * import KeyvValkey from '@keyv/valkey';
   *
   * const cfg = configCache({
   *   keyv: Keyv,
   *   stores: [
   *     { type: 'memory', adapter: KeyvCacheableMemory },
   *     { type: 'redis',  adapter: KeyvRedis },
   *     { type: 'valkey', adapter: KeyvValkey },
   *   ],
   * });
   * ```
   */
  adapter?: new (...args: unknown[]) => unknown;

  /** Connection URL (redis / valkey), e.g. `redis://localhost:6379`. */
  url?: string;
  /** Max items (memory store). */
  max?: number;
  /** Key prefix for namespacing. */
  keyPrefix?: string;
  /** Enable RDS (ElastiCache) TLS mode. */
  rdsEnabled?: boolean;
  /** TTL override for this store (seconds). */
  ttl?: number;
}

/** Top-level cache configuration. */
export interface CacheConfigOptions {
  /**
   * Default TTL (seconds).
   * When `keyv` is provided, this value is converted to milliseconds for Keyv.
   */
  ttl?: number;

  /** Register as `@Global()`. */
  isGlobal?: boolean;

  /**
   * One or more cache stores. Pass multiple to enable multi-tier caching.
   * Each store creates a separate `Keyv` instance.
   */
  stores?: CacheStoreConfig[];

  /**
   * The `Keyv` class from the `keyv` package.
   *
   * Required when any store provides an `adapter` — the config builds Keyv
   * instances so the output is ready for `CacheModule.register()`.
   *
   * @example
   * ```ts
   * import Keyv from 'keyv';
   * ```
   */
  keyv?: new (options?: Record<string, unknown>) => Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type StoreRecord = Record<string, unknown>;

interface KeyvStoreData {
  type: CacheStoreConfig['type'];
  name?: string;
  adapter?: new (...args: unknown[]) => unknown;
  url?: string;
  keyPrefix?: string;
  rdsEnabled?: boolean;
  max?: number;
  ttl?: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

import { createRequire } from 'node:module';

const REQUIRED_PACKAGES: Record<string, string[]> = {
  redis: ['cacheable', '@keyv/redis'],
  valkey: ['cacheable', '@keyv/valkey'],
  memory: ['cacheable'],
};

function checkDependencies(stores: CacheStoreConfig[]): void {
  const missing = new Set<string>();

  for (const store of stores) {
    const pkgs = REQUIRED_PACKAGES[store.type];
    if (!pkgs) continue;

    for (const pkg of pkgs) {
      try {
        createRequire(process.cwd()).resolve(pkg);
      } catch {
        missing.add(pkg);
      }
    }
  }

  if (missing.size > 0) {
    const packages = [...missing].join(', ');
    throw new Error(
      `[@os.io/nest-kit] Missing cache dependencies: ${packages}. ` +
        `Install them: npm install ${packages}`,
    );
  }
}

function readStr(get: Getter, name: string | undefined, ...suffixes: string[]): string | undefined {
  for (const suffix of suffixes) {
    if (name) {
      const v = get.str(`CACHE_${name.toUpperCase()}_${suffix}`);
      if (v !== undefined) return v;
    }
    const v = get.str(suffix);
    if (v !== undefined) return v;
  }
  return undefined;
}

function readNum(get: Getter, name: string | undefined, ...suffixes: string[]): number | undefined {
  for (const suffix of suffixes) {
    if (name) {
      const v = get.num(`CACHE_${name.toUpperCase()}_${suffix}`);
      if (v !== undefined) return v;
    }
    const v = get.num(suffix);
    if (v !== undefined) return v;
  }
  return undefined;
}

function buildAdapterOptions(
  name: string | undefined,
  opt: KeyvStoreData | undefined,
  get: Getter,
  prefix: string,
): Record<string, unknown> {
  const rds = opt?.rdsEnabled ?? get.bool('RDS_CACHE_ENABLED', false);
  const keyPrefix = opt?.keyPrefix ?? readStr(get, name, 'KEY_PREFIX', `${prefix}_KEY_PREFIX`);
  const url = opt?.url ?? readStr(get, name, 'URL', `${prefix}_URL`) ?? 'redis://localhost:6379/0';

  return { url, keyPrefix, ...(rds ? { socket: { tls: true } } : {}) };
}

function parseStores(get: Getter, options?: CacheConfigOptions): KeyvStoreData[] {
  const userStores = options?.stores;
  const raw = userStores?.map((s) => s.type).join(',') ?? get.str('CACHE_STORE') ?? 'memory';

  const types = raw.split(',').map((s) => s.trim() as CacheStoreConfig['type']);

  return types.map((type) => {
    const opt = userStores?.find((s) => s.type === type);
    const storeName = opt?.name;

    const maxVal = opt?.max ?? readNum(get, storeName, 'MAX', 'CACHE_MAX') ?? 100;
    const ttlVal = opt?.ttl ?? options?.ttl ?? readNum(get, storeName, 'TTL', 'CACHE_TTL') ?? 60;

    const base: KeyvStoreData = {
      type,
      name: storeName,
      adapter: opt?.adapter,
      max: maxVal,
      ttl: ttlVal,
    };

    if (type === 'memory') return base;

    const prefix = type === 'redis' ? 'REDIS' : 'VALKEY';

    return {
      ...base,
      ...buildAdapterOptions(storeName, opt, get, prefix),
      rdsEnabled: opt?.rdsEnabled ?? get.bool('RDS_CACHE_ENABLED', false),
    };
  });
}

function toMilliseconds(seconds: number): number {
  return seconds * 1000;
}

function buildCacheConfig(get: Getter, options?: CacheConfigOptions): StoreRecord {
  const KeyvClass = options?.keyv;
  const stores = parseStores(get, options);

  checkDependencies(stores.map((s) => ({ type: s.type })));

  const base: StoreRecord = {
    ttl: options?.ttl ?? get.num('CACHE_TTL') ?? 60,
    isGlobal: options?.isGlobal ?? get.bool('CACHE_IS_GLOBAL', false),
  };

  // When Keyv class is provided, build Keyv instances
  if (KeyvClass) {
    const keyvInstances = stores.map((s) => {
      const ttlMs = toMilliseconds(s.ttl ?? 60);

      if (s.type === 'memory') {
        const adapterOptions: Record<string, unknown> = {};
        if (s.max !== undefined) adapterOptions.lruSize = s.max;
        const adapter = s.adapter ? new s.adapter(adapterOptions) : undefined;

        // In-memory without adapter → Keyv default (no explicit store)
        if (!adapter) {
          return { keyv: new KeyvClass({ ttl: ttlMs }), name: s.name };
        }

        return {
          keyv: new KeyvClass({ store: adapter, ttl: ttlMs }),
          name: s.name,
        };
      }

      // redis / valkey — always need adapter
      if (!s.adapter) {
        throw new Error(
          `Cache store "${s.type}" requires an adapter. ` +
            `Install the package and pass adapter in config. ` +
            `e.g. { type: "${s.type}", adapter: Keyv${s.type === 'redis' ? 'Redis' : 'Valkey'} }`,
        );
      }

      const adapterOptions = buildAdapterOptions(
        s.name,
        s,
        get,
        s.type === 'redis' ? 'REDIS' : 'VALKEY',
      );
      const keyvAdapter = new s.adapter(adapterOptions.url, adapterOptions);

      return {
        keyv: new KeyvClass({ store: keyvAdapter, ttl: ttlMs }),
        name: s.name,
      };
    });

    // Single store — flatten, include name if set
    if (keyvInstances.length === 1) {
      const entry = keyvInstances[0];
      const out: StoreRecord = { store: entry.keyv, ...base };
      if (entry.name) out.name = entry.name;
      return out;
    }

    return { stores: keyvInstances, ...base };
  }

  // Without Keyv class — return raw config data
  if (stores.length === 1) {
    const out: StoreRecord = { ...base, ...stores[0] };
    if (stores[0].name) out.name = stores[0].name;
    return out;
  }

  return { ...base, stores };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Build cache module options from environment variables or ConfigService.
 *
 * When `configService` is provided, reads from it (which internally may read
 * `process.env` by default). Otherwise reads directly from `process.env`.
 *
 * @param options - Optional overrides (stores, Keyv, TTL, etc.).
 * @param configService - Optional ConfigService (for `registerAsync` pattern).
 *
 * @example
 * ```ts
 * // Sync — reads process.env
 * CacheModule.register(configCache({ keyv: Keyv, stores: [...] }))
 *
 * // Async — uses ConfigService
 * CacheModule.registerAsync({
 *   imports: [ConfigModule],
 *   inject: [ConfigService],
 *   useFactory: (cs) => configCache({ keyv: Keyv, stores: [...] }, cs),
 * })
 * ```
 *
 * Environment variables:
 * | Variable                  | Default                    | Description                               |
 * |---------------------------|----------------------------|-------------------------------------------|
 * | `CACHE_STORE`             | `memory`                   | Comma-separated store types               |
 * | `CACHE_TTL`               | `60`                       | Default TTL (seconds)                     |
 * | `CACHE_MAX`               | `100`                      | Max items (memory store)                  |
 * | `CACHE_IS_GLOBAL`         | `false`                    | Register as global module                 |
 * | `CACHE_{NAME}_URL`        | —                          | Named-store URL (overrides `REDIS_URL`)   |
 * | `CACHE_{NAME}_KEY_PREFIX` | —                          | Named-store key prefix                    |
 * | `CACHE_{NAME}_TTL`        | —                          | Named-store TTL (overrides `CACHE_TTL`)   |
 * | `CACHE_{NAME}_MAX`        | —                          | Named-store max (overrides `CACHE_MAX`)   |
 * | `REDIS_URL`               | `redis://localhost:6379/0` | Redis connection URL                      |
 * | `REDIS_KEY_PREFIX`        | —                          | Redis key prefix                          |
 * | `VALKEY_URL`              | `redis://localhost:6379/0` | Valkey connection URL                     |
 * | `VALKEY_KEY_PREFIX`       | —                          | Valkey key prefix                         |
 * | `RDS_CACHE_ENABLED`        | `false`                    | Enable TLS for Redis / Valkey             |
 */
export const configCache = withConfig<CacheConfigOptions, StoreRecord>(buildCacheConfig);
