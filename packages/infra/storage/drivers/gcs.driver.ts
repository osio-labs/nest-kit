import { loadGCS } from '../utils/loaders.js';
import type { StorageDriver, GCSDriverConfig } from '../storage.types.js';

/**
 * Create a Google Cloud Storage driver.
 *
 * Requires the optional `@google-cloud/storage` peer dependency.
 */
export async function createGcsDriver(config: GCSDriverConfig): Promise<StorageDriver> {
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
  const { Storage } = await loadGCS();

  const storage = config.credentials
    ? new Storage({ credentials: config.credentials })
    : new Storage();

  const bucket = storage.bucket(config.bucket);

  const put: StorageDriver['put'] = async (key, body) => {
    const file = bucket.file(key);
    if (Buffer.isBuffer(body)) {
      await file.save(body);
    } else {
      await new Promise<void>((resolve, reject) => {
        body
          .pipe(file.createWriteStream({ resumable: false }))
          .on('finish', () => resolve())
          .on('error', reject);
      });
    }
    return key;
  };

  const get: StorageDriver['get'] = async (key) => {
    const [buf] = await bucket.file(key).download();
    return buf;
  };

  const del: StorageDriver['delete'] = async (key) => {
    try {
      await bucket.file(key).delete();
    } catch {
      // idempotent
    }
  };

  const exists: StorageDriver['exists'] = async (key) => {
    const [ok] = await bucket.file(key).exists();
    return ok;
  };

  const url: StorageDriver['url'] = (key) => {
    if (config.baseUrl) {
      const separator = config.baseUrl.endsWith('/') ? '' : '/';
      return `${config.baseUrl}${separator}${key}`;
    }
    return `https://storage.googleapis.com/${config.bucket}/${key}`;
  };

  const signedUrl: StorageDriver['signedUrl'] = async (key, expiresIn = 3600) => {
    const [url] = await bucket.file(key).getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });
    return url;
  };

  const copy: StorageDriver['copy'] = async (from, to) => {
    await bucket.file(from).copy(bucket.file(to));
  };

  const move: StorageDriver['move'] = async (from, to) => {
    await bucket.file(from).move(bucket.file(to));
  };

  const list: StorageDriver['list'] = async (prefix?: string) => {
    const [files] = await bucket.getFiles({ prefix });
    return files.map((f: any) => f.name as string);
  };

  return { put, get, delete: del, exists, url, signedUrl, copy, move, list };
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
}
