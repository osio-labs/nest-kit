// ──────── Types ────────
export type {
  StorageDriver,
  StoragePutOptions,
  LocalDriverConfig,
  S3DriverConfig,
  MemoryDriverConfig,
  GCSDriverConfig,
  StorageDriverConfig,
  StorageModuleOptions,
  StorageModuleAsyncOptions,
  ImageOptions,
} from './storage.types.js';

// ──────── Registry ────────
export { registerDriver, getDriverFactory, hasDriver } from './drivers/registry.js';

// ──────── Drivers ────────
export { createLocalDriver } from './drivers/local.driver.js';
export { createS3Driver } from './drivers/s3.driver.js';
export { createMemoryDriver } from './drivers/memory.driver.js';
export { createGcsDriver } from './drivers/gcs.driver.js';

// ──────── Manager ────────
export { StorageManager } from './manager/manager.js';

// ──────── Image processing ────────
export { processImage } from './image/processor.js';

// ──────── NestJS module ────────
export { StorageModule } from './storage.module.js';

// ──────── Constants ────────
export { STORAGE_MODULE_OPTIONS, STORAGE_MANAGER } from './storage.constants.js';
