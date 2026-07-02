import { Test } from '@nestjs/testing';
import { StorageModule } from './storage.module';
import { StorageManager } from './manager/manager';
import { STORAGE_MODULE_OPTIONS, STORAGE_MANAGER } from './storage.constants';
import type { StorageModuleOptions, StorageModuleAsyncOptions } from './storage.types';

// ──────── Helpers ────────

function tempDir(): string {
  const { mkdtempSync } = require('node:fs');
  const { join } = require('node:path');
  const { tmpdir } = require('node:os');
  return mkdtempSync(join(tmpdir(), 'module-test-'));
}

// ──────── StorageModule.forRoot ────────

describe('StorageModule.forRoot', () => {
  let dir: string;

  beforeAll(() => {
    dir = tempDir();
  });

  afterAll(async () => {
    const { rm } = await import('node:fs/promises');
    await rm(dir, { recursive: true, force: true });
  });

  it('should return a global DynamicModule', () => {
    const mod = StorageModule.forRoot({
      disks: { local: { driver: 'local', root: dir } },
    });

    expect(mod.module).toBe(StorageModule);
    expect(mod.global).toBe(true);
    expect(mod.exports).toContain(StorageManager);
  });

  it('should create providers with options token and StorageManager', () => {
    const mod = StorageModule.forRoot({
      disks: { local: { driver: 'local', root: dir } },
    });

    const providerTokens = (mod.providers ?? []).map((p: any) =>
      p.provide !== undefined ? p.provide : p,
    );
    expect(providerTokens).toContain(STORAGE_MODULE_OPTIONS);
    expect(providerTokens).toContain(StorageManager);
  });

  it('should work with Test.createTestingModule', async () => {
    const module = await Test.createTestingModule({
      imports: [
        StorageModule.forRoot({
          disks: { local: { driver: 'local', root: dir } },
        }),
      ],
    }).compile();

    const manager = module.get(StorageManager);
    expect(manager).toBeInstanceOf(StorageManager);

    const disk = manager.disk();
    await disk.put('hello.txt', Buffer.from('world'));
    const content = await disk.get('hello.txt');
    expect(content.toString()).toBe('world');
  });
});

// ──────── StorageModule.forRootAsync ────────

describe('StorageModule.forRootAsync', () => {
  let dir: string;

  beforeAll(() => {
    dir = tempDir();
  });

  afterAll(async () => {
    const { rm } = await import('node:fs/promises');
    await rm(dir, { recursive: true, force: true });
  });

  it('should return a DynamicModule with async providers', () => {
    const asyncOptions: StorageModuleAsyncOptions = {
      useFactory: () => ({
        disks: { local: { driver: 'local', root: dir } },
      }),
    };

    const mod = StorageModule.forRootAsync(asyncOptions);

    expect(mod.module).toBe(StorageModule);
    expect(mod.exports).toContain(StorageManager);

    const providerTokens = (mod.providers ?? []).map((p: any) =>
      p.provide !== undefined ? p.provide : p,
    );
    expect(providerTokens).toContain(STORAGE_MODULE_OPTIONS);
    expect(providerTokens).toContain(StorageManager);
  });

  it('should respect global option', () => {
    const mod = StorageModule.forRootAsync({
      useFactory: () => ({
        disks: { local: { driver: 'local', root: dir } },
      }),
      global: false,
    });

    expect(mod.global).toBe(false);
  });

  it('should work with Test.createTestingModule', async () => {
    const module = await Test.createTestingModule({
      imports: [
        StorageModule.forRootAsync({
          useFactory: () => ({
            disks: { local: { driver: 'local', root: dir } },
          }),
        }),
      ],
    }).compile();

    const manager = module.get(StorageManager);
    expect(manager).toBeInstanceOf(StorageManager);

    const disk = manager.disk();
    await disk.put('async.txt', Buffer.from('async-test'));
    const content = await disk.get('async.txt');
    expect(content.toString()).toBe('async-test');
  });

  it('should work with inject and imports', async () => {
    const module = await Test.createTestingModule({
      imports: [
        StorageModule.forRootAsync({
          imports: [],
          inject: [],
          useFactory: () => ({
            disks: { local: { driver: 'local', root: dir } },
          }),
        }),
      ],
    }).compile();

    const manager = module.get(StorageManager);
    expect(manager).toBeInstanceOf(StorageManager);
    expect(manager.disksList()).toEqual(['local']);
  });
});
