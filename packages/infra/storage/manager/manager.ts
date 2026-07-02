import type { StorageDriver, StorageModuleOptions } from '../storage.types';
import { getDriverFactory } from '../drivers/registry';

/**
 * Multi-disk storage manager.
 *
 * Wraps one or more named storage drivers and provides a uniform
 * `.disk()` accessor so consumers can switch between backends with
 * a single string.
 *
 * @example
 * ```typescript
 * const storage = await StorageManager.create({
 *   disks: {
 *     avatars: { driver: 'local', root: './uploads/avatars', baseUrl: '/avatars' },
 *     backups: { driver: 's3', bucket: 'my-backups', region: 'us-east-1' },
 *   },
 *   defaultDisk: 'avatars',
 * });
 *
 * await storage.disk().put('user-1.jpg', buffer);
 * await storage.disk('backups').put('db-dump.sql', buffer);
 * ```
 */
export class StorageManager {
  private readonly drivers: Map<string, StorageDriver>;
  private readonly defaultDisk: string;

  private constructor(drivers: Map<string, StorageDriver>, defaultDisk: string) {
    this.drivers = drivers;
    this.defaultDisk = defaultDisk;
  }

  /**
   * Create a StorageManager and initialise all configured disks.
   *
   * All driver factories run in parallel so S3 / other async setup
   * does not block local-disk creation.
   */
  static async create(options: StorageModuleOptions): Promise<StorageManager> {
    const diskNames = Object.keys(options.disks);
    if (diskNames.length === 0) {
      throw new Error('At least one storage disk must be configured');
    }

    const defaultDisk = options.defaultDisk ?? diskNames[0];
    const drivers = new Map<string, StorageDriver>();

    await Promise.all(
      diskNames.map(async (name) => {
        const config = options.disks[name];
        const factory = getDriverFactory(config.driver);
        drivers.set(name, await factory(config));
      }),
    );

    return new StorageManager(drivers, defaultDisk);
  }

  /**
   * Resolve a named disk.
   *
   * @param name  Disk name (defaults to the configured default disk).
   */
  disk(name?: string): StorageDriver {
    const driver = this.drivers.get(name ?? this.defaultDisk);
    if (!driver) {
      const known = [...this.drivers.keys()].join(', ');
      throw new Error(
        `Unknown storage disk "${name ?? this.defaultDisk}". Configured disks: ${known}`,
      );
    }
    return driver;
  }

  /** List all configured disk names. */
  disksList(): string[] {
    return [...this.drivers.keys()];
  }
}
