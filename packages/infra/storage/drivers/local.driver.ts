import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { StorageDriver, StoragePutOptions } from '../storage.types.js';

/**
 * Create a local-filesystem storage driver.
 *
 * @param config.root    Absolute path to the storage root directory.
 * @param config.baseUrl Optional public URL prefix for `url()`.
 */
export function createLocalDriver(config: { root: string; baseUrl?: string }): StorageDriver {
  const root = resolve(config.root);

  return {
    async put(key: string, body: Buffer | Readable, _options?: StoragePutOptions): Promise<string> {
      const filePath = join(root, key);
      await mkdir(dirname(filePath), { recursive: true });

      if (Buffer.isBuffer(body)) {
        await writeFile(filePath, body);
      } else {
        const ws = createWriteStream(filePath);
        await pipeline(body, ws);
      }

      return key;
    },

    async get(key: string): Promise<Buffer> {
      return readFile(join(root, key));
    },

    async delete(key: string): Promise<void> {
      try {
        await unlink(join(root, key));
      } catch {
        // idempotent
      }
    },

    async exists(key: string): Promise<boolean> {
      try {
        await readFile(join(root, key));
        return true;
      } catch {
        return false;
      }
    },

    url(key: string): string {
      if (config.baseUrl) {
        const separator = config.baseUrl.endsWith('/') ? '' : '/';
        return `${config.baseUrl}${separator}${key}`;
      }
      return `file://${join(root, key)}`;
    },

    signedUrl(key: string, _expiresIn?: number): Promise<string> {
      return Promise.resolve(
        config.baseUrl
          ? `${config.baseUrl.replace(/\/+$/, '')}/${key}`
          : `file://${join(root, key)}`,
      );
    },

    async copy(from: string, to: string): Promise<void> {
      const dest = join(root, to);
      await mkdir(dirname(dest), { recursive: true });
      await copyFile(join(root, from), dest);
    },

    async move(from: string, to: string): Promise<void> {
      const dest = join(root, to);
      await mkdir(dirname(dest), { recursive: true });
      await rename(join(root, from), dest);
    },

    async list(prefix?: string): Promise<string[]> {
      const dir = prefix ? join(root, prefix) : root;
      const files: string[] = [];
      await walk(dir, files);
      return files.map((f) => relative(root, f));
    },
  };
}

async function walk(dir: string, acc: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, acc);
    } else {
      acc.push(full);
    }
  }
}
