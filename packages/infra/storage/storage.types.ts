import type { Readable } from 'node:stream';

/**
 * Options passed to the `put` method of a storage driver.
 */
export interface StoragePutOptions {
  /** MIME type of the file (e.g. `image/png`). */
  mimeType?: string;

  /** Arbitrary metadata stored alongside the object (S3 only). */
  metadata?: Record<string, string>;
}

/**
 * Uniform storage-driver interface.
 *
 * Every driver (local filesystem, S3, …) implements this contract so
 * consumers can swap backends without changing application code.
 */
export interface StorageDriver {
  /**
   * Write a file / object.
   *
   * @param key   Path / object key inside the disk.
   * @param body  File content as a Buffer or a Node.js Readable stream.
   * @returns     The `key` that was written.
   */
  put(key: string, body: Buffer | Readable, options?: StoragePutOptions): Promise<string>;

  /** Read a file / object into a Buffer. */
  get(key: string): Promise<Buffer>;

  /**
   * Delete a file / object.
   * Implementations should be idempotent (no error if key does not exist).
   */
  delete(key: string): Promise<void>;

  /** Check whether a file / object exists. */
  exists(key: string): Promise<boolean>;

  /**
   * Public (unsigned) URL for the given key.
   *
   * For S3 this returns the virtual-hosted–style URL or a custom `baseUrl`
   * if one was configured. For the local driver it returns a `file://` path
   * or a configured `baseUrl`.
   */
  url(key: string): string;

  /**
   * Generate a pre-signed (time-limited) URL for the given key.
   *
   * Pre-signed URLs delegate authentication to the URL itself so anyone
   * with the URL can access the resource for the duration of the expiry.
   *
   * **S3 driver** – generates a signed `GetObject` URL.
   * **Local driver** – returns the same as `url()` (signing not applicable).
   *
   * @param key        Object key.
   * @param expiresIn  Expiry in seconds (default 3600 / 1 hour).
   */
  signedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Copy a file / object from one key to another.
   *
   * @throws If the source key does not exist.
   */
  copy(from: string, to: string): Promise<void>;

  /**
   * Move / rename a file / object.
   *
   * Equivalent to `copy` + `delete`. S3 drivers implement this
   * server-side when possible.
   *
   * @throws If the source key does not exist.
   */
  move(from: string, to: string): Promise<void>;

  /**
   * List object keys under an optional prefix (directory).
   *
   * Returns relative keys that can be passed to `get`, `delete`, etc.
   */
  list(prefix?: string): Promise<string[]>;
}

// ──────── Driver configuration ────────

/** Configuration for the local filesystem driver. */
export interface LocalDriverConfig {
  driver: 'local';

  /**
   * Absolute path to the root directory where files are stored.
   *
   * @example
   * ```typescript
   * root: join(process.cwd(), 'uploads')
   * ```
   */
  root: string;

  /**
   * Optional public base URL.
   *
   * When set, `url(key)` returns `${baseUrl}/${key}` instead of
   * a `file://` path – useful when the uploads are served by a
   * static-file middleware (Express `serve-static`, nginx, …).
   */
  baseUrl?: string;
}

/**
 * Configuration for the S3 / S3-compatible driver.
 *
 * Works with AWS S3, MinIO, Cloudflare R2, Backblaze B2, and any
 * other S3-compatible object store.
 */
export interface S3DriverConfig {
  driver: 's3';

  /** S3 bucket name. */
  bucket: string;

  /** AWS region (e.g. `us-east-1`). Required for AWS S3. */
  region?: string;

  /**
   * Custom endpoint for S3-compatible stores (MinIO, R2, B2, …).
   *
   * @example
   * ```typescript
   * endpoint: 'https://s3.eu-central-003.backblazeb2.com'
   * ```
   */
  endpoint?: string;

  /** AWS credentials. Falls back to the default credential chain when omitted. */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };

  /**
   * Public base URL for signed-out access (e.g. a CDN or bucket website).
   *
   * When set, `url(key)` returns `${baseUrl}/${key}` instead of the
   * native S3 URL.
   */
  baseUrl?: string;

  /** Force path-style addressing (`https://endpoint/bucket/key`). Required by MinIO. */
  forcePathStyle?: boolean;
}

/**
 * Configuration for the in-memory driver (zero dependencies).
 *
 * Useful for testing, development, and ephemeral environments.
 * Data is lost when the process exits.
 */
export interface MemoryDriverConfig {
  driver: 'memory';

  /**
   * Optional base URL for `url()`.
   * @example 'https://cdn.example.com/files'
   */
  baseUrl?: string;
}

/**
 * Configuration for the Google Cloud Storage driver.
 *
 * Requires the optional `@google-cloud/storage` peer dependency.
 *
 * @example
 * ```typescript
 * {
 *   driver: 'gcs',
 *   bucket: 'my-app-bucket',
 *   baseUrl: 'https://storage.googleapis.com/my-app-bucket',
 * }
 * ```
 */
export interface GCSDriverConfig {
  driver: 'gcs';

  /** GCS bucket name. */
  bucket: string;

  /**
   * Public base URL (e.g. CDN or bucket website).
   * Falls back to `https://storage.googleapis.com/${bucket}/${key}` when omitted.
   */
  baseUrl?: string;

  /**
   * Optional GCS credentials. Falls back to Application Default Credentials.
   */
  credentials?: {
    client_email: string;
    private_key: string;
  };
}

/** Union of all supported driver configurations. */
export type StorageDriverConfig =
  LocalDriverConfig | S3DriverConfig | MemoryDriverConfig | GCSDriverConfig;

// ──────── Module options ────────

/** Options accepted by `StorageModule.forRoot()`. */
export interface StorageModuleOptions {
  /** Named disk configurations. At least one disk is required. */
  disks: Record<string, StorageDriverConfig>;

  /**
   * Name of the default disk (used when `.disk()` is called without arguments).
   * Defaults to the first key in `disks`.
   */
  defaultDisk?: string;
}

/** Options accepted by `StorageModule.forRootAsync()`. */
export interface StorageModuleAsyncOptions {
  useFactory: (...args: unknown[]) => Promise<StorageModuleOptions> | StorageModuleOptions;
  inject?: any[];
  imports?: any[];
  global?: boolean;
}

// ──────── Image processing ────────

/** Options for the `processImage` utility (requires `sharp`). */
export interface ImageOptions {
  /** Output width in pixels. */
  width?: number;

  /** Output height in pixels. */
  height?: number;

  /**
   * How the image should be resized to fit the given dimensions.
   *
   * - `cover`   – crop to cover both dimensions (default)
   * - `contain` – letterbox / pillarbox to fit inside
   * - `fill`    – stretch to dimensions (ignores aspect ratio)
   * - `inside`  – resize so width & height are **≤** the target
   * - `outside` – resize so width & height are **≥** the target
   */
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

  /** Output format. Converts the image when set. */
  format?: 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff';

  /** Output quality (1–100). Only applies to lossy formats. */
  quality?: number;
}
