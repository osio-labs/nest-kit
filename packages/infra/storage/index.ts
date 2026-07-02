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
} from './storage.types';

// ──────── Registry ────────
export { registerDriver, getDriverFactory, hasDriver } from './drivers/registry';

// ──────── Drivers ────────
export { createLocalDriver } from './drivers/local.driver';
export { createS3Driver } from './drivers/s3.driver';
export { createMemoryDriver } from './drivers/memory.driver';
export { createGcsDriver } from './drivers/gcs.driver';

// ──────── Manager ────────
export { StorageManager } from './manager/manager';

// ──────── Image processing ────────
export { processImage } from './image/processor';

// ──────── NestJS module ────────
export { StorageModule } from './storage.module';

// ──────── Constants ────────
export { STORAGE_MODULE_OPTIONS, STORAGE_MANAGER } from './storage.constants';
