import { Readable } from 'node:stream';
import type { StorageDriver, StoragePutOptions } from '../storage.types';

/**
 * Create an in-memory storage driver.
 *
 * All data is stored in a `Map<string, Buffer>` and is lost when the
 * process exits. Useful for testing and development.
 */
export function createMemoryDriver(config: { baseUrl?: string } = {}): StorageDriver {
  const store = new Map<string, Buffer>();

  return {
    async put(key: string, body: Buffer | Readable, _options?: StoragePutOptions): Promise<string> {
      if (Buffer.isBuffer(body)) {
        store.set(key, body);
      } else {
        const chunks: Buffer[] = [];
        for await (const chunk of body) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        store.set(key, Buffer.concat(chunks));
      }
      return key;
    },

    get(key: string): Promise<Buffer> {
      const buf = store.get(key);
      if (!buf) return Promise.reject(new Error(`Object "${key}" does not exist`));
      return Promise.resolve(buf);
    },

    delete(_key: string): Promise<void> {
      store.delete(_key);
      return Promise.resolve();
    },

    exists(key: string): Promise<boolean> {
      return Promise.resolve(store.has(key));
    },

    url(key: string): string {
      if (config.baseUrl) {
        const separator = config.baseUrl.endsWith('/') ? '' : '/';
        return `${config.baseUrl}${separator}${key}`;
      }
      return `memory://${key}`;
    },

    signedUrl(key: string, _expiresIn?: number): Promise<string> {
      return Promise.resolve(
        config.baseUrl ? `${config.baseUrl.replace(/\/+$/, '')}/${key}` : `memory://${key}`,
      );
    },

    copy(from: string, to: string): Promise<void> {
      const buf = store.get(from);
      if (!buf) return Promise.reject(new Error(`Object "${from}" does not exist`));
      store.set(to, buf);
      return Promise.resolve();
    },

    move(from: string, to: string): Promise<void> {
      const buf = store.get(from);
      if (!buf) return Promise.reject(new Error(`Object "${from}" does not exist`));
      store.set(to, buf);
      store.delete(from);
      return Promise.resolve();
    },

    list(prefix?: string): Promise<string[]> {
      const keys = [...store.keys()];
      if (!prefix) return Promise.resolve(keys.sort());
      return Promise.resolve(keys.filter((k) => k.startsWith(prefix)).sort());
    },
  };
}
