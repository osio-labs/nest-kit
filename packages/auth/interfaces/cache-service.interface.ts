/**
 * Minimal cache abstraction consumed internally by the auth module.
 *
 * > IMPORTANT: You must register a provider under the `'CACHE_SERVICE'`
 * > token (or a custom token via `AuthModuleOptions.cacheServiceToken`).
 * > The provider can be any compatible cache implementation:
 * >   - `cache-manager` (`Cache` from `@nestjs/cache-manager`)
 * >   - `keyv` instance
 * >   - A custom wrapper implementing this interface
 *
 * @example
 * ```typescript
 * // Register this in your consumer module:
 * {
 *   provide: 'CACHE_SERVICE',
 *   useExisting: getCache(), // your cache instance
 * }
 * ```
 */
export interface ICacheService {
  /** Retrieve a cached value by key */
  get<T = unknown>(key: string): Promise<T | undefined>;

  /** Store a value with optional TTL (seconds) */
  set<T = unknown>(key: string, value: T, ttl?: number): Promise<void>;

  /** Delete a single key */
  del(key: string): Promise<void>;

  /** Flush entire cache (use with care) */
  reset(): Promise<void>;
}
