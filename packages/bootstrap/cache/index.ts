/**
 * @os.io/nest-kit/bootstrap/cache
 *
 * Cache module configuration bootstrapper for NestJS applications.
 * Supports memory, Redis, Valkey, and multi-tier caching.
 *
 * Store types and adapters are auto-detected from environment variables.
 * No need to pass stores or adapters programmatically.
 *
 * @module
 * @packageDocumentation
 */

import type { ConfigService } from '@nestjs/config';
import type { Getter } from '../with-config.js';
import { withConfig } from '../with-config.js';
import { createRequire } from 'node:module';

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

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
   * The `Keyv` class from the `keyv` package.
   *
   * When provided, the config builds Keyv instances so the output
   * is ready for `CacheModule.register()`.
   *
   * @example
   * ```ts
   * import Keyv from 'keyv';
   * ```
   */
  keyv?: new (options?: Record<string, unknown>) => Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Internal types                                                     */
/* ------------------------------------------------------------------ */

type StoreType = 'memory' | 'redis' | 'valkey';

type StoreRecord = Record<string, unknown>;

interface KeyvStoreData {
  type: StoreType;
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

type AdapterCtor = new (...args: unknown[]) => unknown;

function loadAdapter(type: StoreType): AdapterCtor {
  const req = createRequire(import.meta.url);

  // Only check peer deps — direct deps (cacheable) are always bundled.
  const peerDeps: Partial<Record<StoreType, string>> = {
    redis: '@keyv/redis',
    valkey: '@keyv/valkey',
  };

  const peerPkg = peerDeps[type];
  if (peerPkg) {
    try {
      req.resolve(peerPkg);
    } catch {
      throw new Error(
        `[@os.io/nest-kit] Missing cache dependency: "${peerPkg}". Install it: npm install ${peerPkg}`,
      );
    }
  }

  const mod = req(type === 'memory' ? 'cacheable' : peerPkg!) as Record<string, unknown>;

  if (type === 'memory') {
    const fallback = (mod.default as Record<string, unknown>)?.KeyvCacheableMemory;
    return (mod.KeyvCacheableMemory ?? fallback) as AdapterCtor;
  }

  return (mod.default ?? mod) as AdapterCtor;
}

function resolveKeyvClass(): new (options?: Record<string, unknown>) => Record<string, unknown> {
  const req = createRequire(import.meta.url);

  try {
    req.resolve('keyv');
  } catch {
    throw new Error('[@os.io/nest-kit] Missing "keyv" dependency. Install it: npm install keyv');
  }

  const mod = req('keyv') as Record<string, unknown>;
  return (mod.default ?? mod) as new (options?: Record<string, unknown>) => Record<string, unknown>;
}

function splitPipe(value: string): string[] {
  return value.split('|').map((s) => s.trim());
}

function detectRds(url: string): boolean {
  return url.startsWith('rediss://');
}

function parseStores(get: Getter, options?: CacheConfigOptions): KeyvStoreData[] {
  const maxVal = get.num('CACHE_MAX') ?? 100;
  const ttlVal = options?.ttl ?? get.num('CACHE_TTL') ?? 60;

  const urlParts = splitPipe(get.str('CACHE_URL') ?? '');
  const typeParts = splitPipe(get.str('CACHE_TYPE') ?? '');
  const prefixParts = splitPipe(get.str('CACHE_PREFIX') ?? '');

  if (typeParts.length > urlParts.length) {
    throw new Error(
      `[@os.io/nest-kit] CACHE_TYPE has ${typeParts.length} entries but CACHE_URL only has ${urlParts.length}. ` +
        `CACHE_TYPE cannot have more entries than CACHE_URL.`,
    );
  }
  if (prefixParts.length > urlParts.length) {
    throw new Error(
      `[@os.io/nest-kit] CACHE_PREFIX has ${prefixParts.length} entries but CACHE_URL only has ${urlParts.length}. ` +
        `CACHE_PREFIX cannot have more entries than CACHE_URL.`,
    );
  }

  return Array.from({ length: urlParts.length }, (_, i) => {
    const raw = urlParts[i];
    const hasUrl = raw !== undefined && raw !== '';

    // Step 1: auto-detect from URL
    let type: StoreType = hasUrl ? 'valkey' : 'memory';
    const url = hasUrl ? raw : undefined;
    const rdsEnabled = hasUrl ? detectRds(raw) : false;

    // Step 2: apply CACHE_TYPE override
    if (typeParts[i] === 'redis' && type !== 'memory') type = 'redis';

    const keyPrefix = prefixParts[i] || undefined;
    const adapter = loadAdapter(type);

    if (type === 'memory') {
      return { type: 'memory', adapter, max: maxVal, ttl: ttlVal };
    }

    return {
      type,
      adapter,
      url: url ?? 'redis://localhost:6379/0',
      keyPrefix,
      rdsEnabled,
      max: maxVal,
      ttl: ttlVal,
    };
  });
}

function toMilliseconds(seconds: number): number {
  return seconds * 1000;
}

function buildAdapterOptions(store: KeyvStoreData): Record<string, unknown> {
  const opts: Record<string, unknown> = {
    url: store.url ?? 'redis://localhost:6379/0',
  };
  if (store.keyPrefix) opts.keyPrefix = store.keyPrefix;
  if (store.rdsEnabled) opts.socket = { tls: true };
  return opts;
}

function buildCacheConfig(get: Getter, options?: CacheConfigOptions): StoreRecord {
  const KeyvClass = options?.keyv ?? resolveKeyvClass();
  const stores = parseStores(get, options);
  const base: StoreRecord = {
    ttl: options?.ttl ?? get.num('CACHE_TTL') ?? 60,
    isGlobal: options?.isGlobal ?? get.bool('CACHE_IS_GLOBAL', false),
  };

  const keyvInstances = stores.map((s) => {
    const ttlMs = toMilliseconds(s.ttl ?? 60);

    if (s.type === 'memory') {
      const adapterOptions: Record<string, unknown> = {};
      if (s.max !== undefined) adapterOptions.lruSize = s.max;
      const adapter = s.adapter ? new s.adapter(adapterOptions) : undefined;

      if (!adapter) {
        return new KeyvClass({ ttl: ttlMs });
      }

      return new KeyvClass({ store: adapter, ttl: ttlMs });
    }

    const adapterOptions = buildAdapterOptions(s);
    const keyvAdapter = new s.adapter!(adapterOptions.url, adapterOptions);

    return new KeyvClass({ store: keyvAdapter, ttl: ttlMs });
  });

  return { ...base, stores: keyvInstances };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Build cache module options from environment variables or ConfigService.
 *
 * Store types are auto-detected from `CACHE_URL` (empty = memory,
 * non-empty = valkey, `rediss://` = TLS). Use `CACHE_TYPE` to
 * override valkey → redis at a given position.
 *
 * Adapters and Keyv class are loaded automatically — no need to import them.
 * Pass `keyv` to override the auto-resolved Keyv class.
 *
 * @param options - Optional overrides (ttl, isGlobal, keyv).
 * @param configService - Optional ConfigService (for `registerAsync` pattern).
 *
 * @example
 * ```ts
 * // Sync — reads process.env
 * CacheModule.register(configCache())
 *
 * // Async — uses ConfigService
 * CacheModule.registerAsync({
 *   imports: [ConfigModule],
 *   inject: [ConfigService],
 *   useFactory: (cs) => configCache(undefined, cs),
 * })
 * ```
 *
 * Environment variables:
 * | Variable         | Default  | Description                                                              |
 * |------------------|----------|--------------------------------------------------------------------------|
 * | `CACHE_URL`      | —        | Pipe-separated URLs. Empty = memory. `rediss://` = TLS. Position-based. |
 * | `CACHE_TYPE`     | —        | Pipe-separated overrides (`redis`). Changes valkey → redis at position.  |
 * | `CACHE_PREFIX`   | —        | Pipe-separated key prefixes. Position matches `CACHE_URL`.               |
 * | `CACHE_TTL`      | `60`     | Default TTL (seconds)                                                    |
 * | `CACHE_MAX`      | `100`    | Max items (memory store)                                                 |
 * | `CACHE_IS_GLOBAL`| `false`  | Register as global module                                                |
 */
export const configCache: (
  options?: CacheConfigOptions,
  configService?: ConfigService,
) => StoreRecord = withConfig<CacheConfigOptions, StoreRecord>(buildCacheConfig);
