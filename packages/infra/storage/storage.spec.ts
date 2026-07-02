import { mkdtempSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { createLocalDriver } from './drivers/local.driver';
import { createMemoryDriver } from './drivers/memory.driver';
import { StorageManager } from './manager/manager';
import { registerDriver, getDriverFactory, hasDriver } from './drivers/registry';

// ──────── Helpers ────────

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'storage-test-'));
}

async function clean(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

// ──────── Local driver ────────

describe('createLocalDriver', () => {
  let dir: string;
  let driver: ReturnType<typeof createLocalDriver>;

  beforeEach(() => {
    dir = tempDir();
    driver = createLocalDriver({ root: dir });
  });

  afterEach(async () => {
    await clean(dir);
  });

  it('should put and get a buffer', async () => {
    const key = await driver.put('test.txt', Buffer.from('hello'));
    expect(key).toBe('test.txt');

    const content = await driver.get('test.txt');
    expect(content.toString()).toBe('hello');
  });

  it('should put and get a stream', async () => {
    const { Readable } = await import('node:stream');
    const stream = Readable.from(['stream-data']);
    const key = await driver.put('stream.txt', stream);
    expect(key).toBe('stream.txt');

    const content = await driver.get('stream.txt');
    expect(content.toString()).toBe('stream-data');
  });

  it('should create nested directories', async () => {
    await driver.put('a/b/c/nested.txt', Buffer.from('nested'));
    const content = await driver.get('a/b/c/nested.txt');
    expect(content.toString()).toBe('nested');
  });

  it('should delete a file', async () => {
    await driver.put('del.txt', Buffer.from('delete me'));
    await driver.delete('del.txt');
    await expect(driver.get('del.txt')).rejects.toThrow();
  });

  it('should not throw on deleting non-existent file', async () => {
    await expect(driver.delete('nonexistent.txt')).resolves.toBeUndefined();
  });

  it('should check existence', async () => {
    await driver.put('exists.txt', Buffer.from('yes'));
    await expect(driver.exists('exists.txt')).resolves.toBe(true);
    await expect(driver.exists('no.txt')).resolves.toBe(false);
  });

  it('should return file:// url when no baseUrl', () => {
    const url = driver.url('test.txt');
    expect(url).toMatch(/^file:\/\//);
    expect(url).toContain('test.txt');
  });

  it('should return baseUrl-prefixed url when baseUrl set', () => {
    const d = createLocalDriver({ root: dir, baseUrl: '/uploads' });
    expect(d.url('test.txt')).toBe('/uploads/test.txt');
  });

  it('should return same as url for signedUrl (local)', async () => {
    const u = await driver.signedUrl('test.txt');
    expect(u).toBe(driver.url('test.txt'));
  });

  it('should copy a file', async () => {
    await driver.put('source.txt', Buffer.from('source'));
    await driver.copy('source.txt', 'dest.txt');

    const src = await driver.get('source.txt');
    const dst = await driver.get('dest.txt');
    expect(src.toString()).toBe('source');
    expect(dst.toString()).toBe('source');
  });

  it('should move a file', async () => {
    await driver.put('src.txt', Buffer.from('movable'));
    await driver.move('src.txt', 'dst.txt');

    await expect(driver.exists('src.txt')).resolves.toBe(false);
    const content = await driver.get('dst.txt');
    expect(content.toString()).toBe('movable');
  });

  it('should list files', async () => {
    await driver.put('a.txt', Buffer.from('a'));
    await driver.put('b.txt', Buffer.from('b'));
    await driver.put('sub/c.txt', Buffer.from('c'));

    const all = await driver.list();
    expect(all).toEqual(expect.arrayContaining(['a.txt', 'b.txt', 'sub/c.txt']));
    expect(all).toHaveLength(3);

    const sub = await driver.list('sub');
    expect(sub).toEqual(['sub/c.txt']);
  });

  it('should handle empty list for non-existent prefix', async () => {
    const files = await driver.list('nonexistent');
    expect(files).toEqual([]);
  });
});

// ──────── Memory driver ────────

describe('createMemoryDriver', () => {
  let driver: ReturnType<typeof createMemoryDriver>;

  beforeEach(() => {
    driver = createMemoryDriver();
  });

  it('should put and get a buffer', async () => {
    const key = await driver.put('test.txt', Buffer.from('hello'));
    expect(key).toBe('test.txt');
    expect((await driver.get('test.txt')).toString()).toBe('hello');
  });

  it('should put and get a stream', async () => {
    const stream = Readable.from(['stream-data']);
    await driver.put('stream.txt', stream);
    expect((await driver.get('stream.txt')).toString()).toBe('stream-data');
  });

  it('should delete a file', async () => {
    await driver.put('del.txt', Buffer.from('delete me'));
    await driver.delete('del.txt');
    await expect(driver.get('del.txt')).rejects.toThrow();
  });

  it('should not throw on deleting non-existent file', async () => {
    await expect(driver.delete('nonexistent.txt')).resolves.toBeUndefined();
  });

  it('should check existence', async () => {
    await driver.put('exists.txt', Buffer.from('yes'));
    await expect(driver.exists('exists.txt')).resolves.toBe(true);
    await expect(driver.exists('no.txt')).resolves.toBe(false);
  });

  it('should return memory:// url when no baseUrl', () => {
    expect(driver.url('test.txt')).toBe('memory://test.txt');
  });

  it('should return baseUrl-prefixed url when baseUrl set', () => {
    const d = createMemoryDriver({ baseUrl: '/uploads' });
    expect(d.url('test.txt')).toBe('/uploads/test.txt');
  });

  it('should return same as url for signedUrl', async () => {
    const u = await driver.signedUrl('test.txt');
    expect(u).toBe(driver.url('test.txt'));
  });

  it('should copy a file', async () => {
    await driver.put('source.txt', Buffer.from('source'));
    await driver.copy('source.txt', 'dest.txt');
    const src = await driver.get('source.txt');
    const dst = await driver.get('dest.txt');
    expect(src.toString()).toBe('source');
    expect(dst.toString()).toBe('source');
  });

  it('should move a file', async () => {
    await driver.put('src.txt', Buffer.from('movable'));
    await driver.move('src.txt', 'dst.txt');
    await expect(driver.exists('src.txt')).resolves.toBe(false);
    expect((await driver.get('dst.txt')).toString()).toBe('movable');
  });

  it('should list files', async () => {
    await driver.put('a.txt', Buffer.from('a'));
    await driver.put('b.txt', Buffer.from('b'));
    await driver.put('sub/c.txt', Buffer.from('c'));

    const all = await driver.list();
    expect(all).toEqual(['a.txt', 'b.txt', 'sub/c.txt']);

    const sub = await driver.list('sub');
    expect(sub).toEqual(['sub/c.txt']);
  });

  it('should handle empty list for non-existent prefix', async () => {
    const files = await driver.list('nonexistent');
    expect(files).toEqual([]);
  });
});

// ──────── GCS driver (mocked) ────────

const mockGcsFile = {
  save: jest.fn().mockResolvedValue(undefined),
  download: jest.fn().mockResolvedValue([Buffer.from('gcs-data')]),
  delete: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue([true]),
  getSignedUrl: jest.fn().mockResolvedValue(['https://signed.gcs.example.com/file']),
  copy: jest.fn().mockResolvedValue(undefined),
  move: jest.fn().mockResolvedValue(undefined),
  createWriteStream: jest.fn(() => {
    const { PassThrough } = require('node:stream');
    const pt = new PassThrough();
    pt.on('pipe', () => {
      pt.end();
    });
    return pt;
  }),
};

const mockBucket = {
  file: jest.fn(() => mockGcsFile),
  getFiles: jest.fn().mockResolvedValue([[{ name: 'a.txt' }, { name: 'b.txt' }]]),
};

jest.mock('./utils/loaders', () => {
  const actual = jest.requireActual('./utils/loaders');
  return {
    ...actual,
    loadGCS: jest
      .fn()
      .mockResolvedValue({ Storage: jest.fn(() => ({ bucket: jest.fn(() => mockBucket) })) }),
  };
});

import { createGcsDriver } from './drivers/gcs.driver';

describe('createGcsDriver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should put a buffer', async () => {
    const driver = await createGcsDriver({ driver: 'gcs', bucket: 'test-bucket' });
    await driver.put('key.txt', Buffer.from('data'));
    expect(mockGcsFile.save).toHaveBeenCalledWith(Buffer.from('data'));
  });

  it('should get a file', async () => {
    const driver = await createGcsDriver({ driver: 'gcs', bucket: 'test-bucket' });
    const buf = await driver.get('key.txt');
    expect(buf.toString()).toBe('gcs-data');
  });

  it('should delete a file', async () => {
    const driver = await createGcsDriver({ driver: 'gcs', bucket: 'test-bucket' });
    await driver.delete('key.txt');
    expect(mockGcsFile.delete).toHaveBeenCalled();
  });

  it('should check existence', async () => {
    const driver = await createGcsDriver({ driver: 'gcs', bucket: 'test-bucket' });
    await expect(driver.exists('key.txt')).resolves.toBe(true);
  });

  it('should return googleapis url when no baseUrl', async () => {
    const driver = await createGcsDriver({ driver: 'gcs', bucket: 'my-bucket' });
    expect(driver.url('f.txt')).toBe('https://storage.googleapis.com/my-bucket/f.txt');
  });

  it('should return baseUrl-prefixed url when baseUrl set', async () => {
    const driver = await createGcsDriver({ driver: 'gcs', bucket: 'b', baseUrl: '/cdn' });
    expect(driver.url('f.txt')).toBe('/cdn/f.txt');
  });

  it('should generate signed url', async () => {
    const driver = await createGcsDriver({ driver: 'gcs', bucket: 'b' });
    const url = await driver.signedUrl('key.txt');
    expect(url).toBe('https://signed.gcs.example.com/file');
  });

  it('should copy a file', async () => {
    const driver = await createGcsDriver({ driver: 'gcs', bucket: 'b' });
    await driver.copy('from.txt', 'to.txt');
    expect(mockGcsFile.copy).toHaveBeenCalled();
  });

  it('should move a file', async () => {
    const driver = await createGcsDriver({ driver: 'gcs', bucket: 'b' });
    await driver.move('from.txt', 'to.txt');
    expect(mockGcsFile.move).toHaveBeenCalled();
  });

  it('should list files', async () => {
    const driver = await createGcsDriver({ driver: 'gcs', bucket: 'b' });
    const files = await driver.list();
    expect(files).toEqual(['a.txt', 'b.txt']);
  });

  it('should list files with prefix', async () => {
    const driver = await createGcsDriver({ driver: 'gcs', bucket: 'b' });
    await driver.list('sub/');
    expect(mockBucket.getFiles).toHaveBeenCalledWith({ prefix: 'sub/' });
  });
});

// ──────── StorageManager ────────

describe('StorageManager', () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDir();
  });

  afterEach(async () => {
    await clean(dir);
  });

  it('should create and resolve default disk', async () => {
    const storage = await StorageManager.create({
      disks: {
        local: { driver: 'local', root: dir },
      },
    });

    const driver = storage.disk();
    await driver.put('hello.txt', Buffer.from('world'));
    const content = await driver.get('hello.txt');
    expect(content.toString()).toBe('world');
  });

  it('should resolve named disk', async () => {
    const storage = await StorageManager.create({
      disks: {
        primary: { driver: 'local', root: dir },
      },
    });

    const driver = storage.disk('primary');
    await driver.put('test.txt', Buffer.from('ok'));
    await expect(driver.exists('test.txt')).resolves.toBe(true);
  });

  it('should list configured disks', async () => {
    const storage = await StorageManager.create({
      disks: {
        a: { driver: 'local', root: dir },
        b: { driver: 'local', root: dir },
      },
    });

    expect(storage.disksList()).toEqual(['a', 'b']);
  });

  it('should throw for unknown disk', async () => {
    const storage = await StorageManager.create({
      disks: {
        local: { driver: 'local', root: dir },
      },
    });

    expect(() => storage.disk('unknown')).toThrow('Unknown storage disk');
  });

  it('should throw when no disks configured', async () => {
    await expect(StorageManager.create({ disks: {} })).rejects.toThrow(
      'At least one storage disk must be configured',
    );
  });

  it('should use first disk as default when no defaultDisk specified', async () => {
    const dir1 = tempDir();
    const dir2 = tempDir();
    await mkdir(dir1, { recursive: true });
    await mkdir(dir2, { recursive: true });

    const storage = await StorageManager.create({
      disks: {
        first: { driver: 'local', root: dir1, baseUrl: '/first' },
        second: { driver: 'local', root: dir2, baseUrl: '/second' },
      },
    });

    expect(storage.disk().url('f.txt')).toBe('/first/f.txt');
    await clean(dir1);
    await clean(dir2);
  });

  it('should respect explicit defaultDisk', async () => {
    const dir1 = tempDir();
    const dir2 = tempDir();
    await mkdir(dir1, { recursive: true });
    await mkdir(dir2, { recursive: true });

    const storage = await StorageManager.create({
      disks: {
        first: { driver: 'local', root: dir1, baseUrl: '/first' },
        second: { driver: 'local', root: dir2, baseUrl: '/second' },
      },
      defaultDisk: 'second',
    });

    expect(storage.disk().url('f.txt')).toBe('/second/f.txt');
    await clean(dir1);
    await clean(dir2);
  });

  it('should work with memory driver', async () => {
    const storage = await StorageManager.create({
      disks: {
        mem: { driver: 'memory' },
      },
    });

    const disk = storage.disk();
    await disk.put('key.txt', Buffer.from('mem-data'));
    expect((await disk.get('key.txt')).toString()).toBe('mem-data');
    expect(disk.url('key.txt')).toBe('memory://key.txt');
  });
});

// ──────── Registry ────────

describe('storage registry', () => {
  it('should have all built-in drivers registered by default', () => {
    expect(hasDriver('local')).toBe(true);
    expect(hasDriver('s3')).toBe(true);
    expect(hasDriver('memory')).toBe(true);
    expect(hasDriver('gcs')).toBe(true);
  });

  it('should return a factory for registered driver', () => {
    const factory = getDriverFactory('local');
    expect(typeof factory).toBe('function');
  });

  it('should throw for unknown driver', () => {
    expect(() => getDriverFactory('unknown')).toThrow('Unknown storage driver');
  });

  it('should throw when registering duplicate driver', () => {
    expect(() => registerDriver('local', async () => ({}) as never)).toThrow('already registered');
  });

  it('should allow registering a custom driver', () => {
    registerDriver('custom-test', async () => ({}) as never);
    expect(hasDriver('custom-test')).toBe(true);
  });
});
