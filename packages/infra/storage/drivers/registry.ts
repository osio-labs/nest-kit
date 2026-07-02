import type { StorageDriver } from '../storage.types';

/**
 * Factory signature for creating a storage driver.
 * All factories are async for uniformity.
 */
export type DriverFactory = (config: any) => Promise<StorageDriver>;

const registry = new Map<string, DriverFactory>();

/**
 * Register a storage driver factory under a given type name.
 *
 * Built-in drivers (`local`, `s3`) are registered automatically.
 * Use this to add custom drivers (GCS, Azure, …).
 *
 * @example
 * ```typescript
 * import { registerDriver } from '@os.io/nest-kit/infra/storage';
 *
 * registerDriver('gcs', async (config) => {
 *   const { createGcsDriver } = await import('./gcs.driver');
 *   return createGcsDriver(config);
 * });
 * ```
 */
export function registerDriver(type: string, factory: DriverFactory): void {
  if (registry.has(type)) {
    throw new Error(`Storage driver "${type}" is already registered`);
  }
  registry.set(type, factory);
}

/**
 * Resolve a driver factory by type name.
 *
 * @throws {Error} If the type has not been registered.
 */
export function getDriverFactory(type: string): DriverFactory {
  const factory = registry.get(type);
  if (!factory) {
    throw new Error(
      `Unknown storage driver "${type}". Make sure the driver is registered via registerDriver().`,
    );
  }
  return factory;
}

/**
 * Check whether a driver type has been registered.
 */
export function hasDriver(type: string): boolean {
  return registry.has(type);
}

// ──────── Register built-in drivers ────────

import { createLocalDriver } from './local.driver';

registerDriver('local', (config) =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  Promise.resolve(createLocalDriver(config)),
);

registerDriver('s3', async (config) => {
  // Lazy import – S3 packages are optional peer deps
  const { createS3Driver } = await import('./s3.driver');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return createS3Driver(config);
});

import { createMemoryDriver } from './memory.driver';

registerDriver('memory', (config) =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  Promise.resolve(createMemoryDriver(config)),
);

registerDriver('gcs', async (config) => {
  // Lazy import – GCS package is an optional peer dep
  const { createGcsDriver } = await import('./gcs.driver');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return createGcsDriver(config);
});
