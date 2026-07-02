# @os.io/nest-kit/infra/storage

> Multi-disk file storage for NestJS — local, S3, GCS, and in-memory drivers with a uniform interface.

```typescript
import { StorageModule } from '@os.io/nest-kit/infra/storage';

@Module({
  imports: [
    StorageModule.forRoot({
      disks: {
        uploads: { driver: 'local', root: './uploads', baseUrl: '/uploads' },
      },
    }),
  ],
})
export class AppModule {}
```

## Installation

```bash
npm install @os.io/nest-kit
```

### Optional peer dependencies

Only install what you need:

```bash
# S3 / MinIO / R2 / B2
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Google Cloud Storage
npm install @google-cloud/storage

# Image processing (sharp)
npm install sharp
```

All optional deps are loaded lazily — the module is safe to import without them; errors are thrown only on use.

---

## Quick Start

### 1. Register the module

```typescript
import { StorageModule } from '@os.io/nest-kit/infra/storage';

StorageModule.forRoot({
  disks: {
    avatars: { driver: 'local', root: './uploads/avatars', baseUrl: '/avatars' },
    backups: { driver: 's3', bucket: 'my-backups', region: 'us-east-1' },
  },
  defaultDisk: 'avatars',
});
```

### 2. Inject and use

```typescript
import { StorageManager } from '@os.io/nest-kit/infra/storage';

@Injectable()
export class UploadService {
  constructor(private readonly storage: StorageManager) {}

  async uploadAvatar(userId: string, file: Buffer) {
    const key = `users/${userId}/avatar.png`;
    await this.storage.disk().put(key, file, { mimeType: 'image/png' });
    return this.storage.disk().url(key);
  }

  async listBackups() {
    return this.storage.disk('backups').list();
  }
}
```

---

## Drivers

### Local

Files are stored on the local filesystem.

```typescript
{ driver: 'local', root: './uploads', baseUrl: '/uploads' }
```

`url(key)` returns `${baseUrl}/${key}` when `baseUrl` is set, otherwise `file://...`.

### Memory

In-process `Map<string, Buffer>`. Data is lost on exit. Ideal for tests and dev.

```typescript
{ driver: 'memory', baseUrl: 'https://cdn.example.com' }
```

### S3 / S3-compatible

Works with AWS S3, MinIO, Cloudflare R2, Backblaze B2, and any S3-compatible store.

```typescript
{
  driver: 's3',
  bucket: 'my-bucket',
  region: 'us-east-1',
  endpoint: 'https://s3.eu-central-003.backblazeb2.com', // optional
  credentials: { accessKeyId: '...', secretAccessKey: '...' }, // optional — falls back to env / IAM
  baseUrl: 'https://cdn.example.com',                      // optional — overrides default S3 URL
  forcePathStyle: true,                                     // required by MinIO
}
```

### GCS

Google Cloud Storage. Requires `@google-cloud/storage`.

```typescript
{
  driver: 'gcs',
  bucket: 'my-app-bucket',
  baseUrl: 'https://storage.googleapis.com/my-app-bucket', // optional
  credentials: { client_email: '...', private_key: '...' }, // optional — falls back to ADC
}
```

---

## Usage

### Basic I/O

```typescript
const disk = storage.disk(); // default disk

// Write
await disk.put('file.txt', Buffer.from('hello'));
await disk.put('stream.txt', readableStream, { mimeType: 'text/plain' });

// Read
const buf = await disk.get('file.txt');

// Check
const exists = await disk.exists('file.txt');

// Delete (idempotent)
await disk.delete('file.txt');
```

### URLs

```typescript
// Public URL
disk.url('file.txt'); // → '/uploads/file.txt'

// Pre-signed (time-limited) URL — S3/GCS generates a signed URL; local returns public URL
await disk.signedUrl('file.txt', 3600); // expires in 1 hour
```

### Copy / Move

```typescript
await disk.copy('from.txt', 'to.txt');
await disk.move('src.txt', 'dst.txt'); // copy + delete, atomic on S3/GCS
```

### List

```typescript
// All files
await disk.list();

// Under a prefix
await disk.list('users/');
```

---

## NestJS Module

### Synchronous config

```typescript
StorageModule.forRoot({
  disks: { ... },
  defaultDisk: 'uploads',
});
```

### Async config (e.g. from ConfigService)

```typescript
StorageModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    disks: config.get('storage.disks'),
    defaultDisk: config.get('storage.defaultDisk'),
  }),
});
```

---

## Image Processing

Resize, convert format, and adjust quality using `sharp` (optional peer dep).

```typescript
import { processImage } from '@os.io/nest-kit/infra/storage';

const thumb = await processImage(originalBuffer, {
  width: 200,
  height: 200,
  fit: 'cover', // cover | contain | fill | inside | outside
  format: 'webp', // jpeg | png | webp | avif | tiff
  quality: 80, // 1–100
});

await storage.disk().put('thumb.webp', thumb);
```

---

## Custom Drivers

Register any custom backend via the driver registry.

```typescript
import { registerDriver } from '@os.io/nest-kit/infra/storage';

registerDriver('azure', async (config) => {
  const { createAzureDriver } = await import('./azure.driver');
  return createAzureDriver(config);
});
```

Then use it in config:

```typescript
{ driver: 'azure', container: 'my-container', connectionString: '...' }
```

---

## API

### `StorageDriver`

| Method                       | Returns             | Description                               |
| ---------------------------- | ------------------- | ----------------------------------------- |
| `put(key, body, options?)`   | `Promise<string>`   | Write a file (Buffer or Readable)         |
| `get(key)`                   | `Promise<Buffer>`   | Read a file                               |
| `delete(key)`                | `Promise<void>`     | Delete a file (idempotent)                |
| `exists(key)`                | `Promise<boolean>`  | Check existence                           |
| `url(key)`                   | `string`            | Public URL                                |
| `signedUrl(key, expiresIn?)` | `Promise<string>`   | Pre-signed time-limited URL               |
| `copy(from, to)`             | `Promise<void>`     | Copy a file                               |
| `move(from, to)`             | `Promise<void>`     | Move / rename a file                      |
| `list(prefix?)`              | `Promise<string[]>` | List object keys under an optional prefix |

### `StorageManager`

| Method        | Returns         | Description                               |
| ------------- | --------------- | ----------------------------------------- |
| `disk(name?)` | `StorageDriver` | Resolve a named disk (default if omitted) |
| `disksList()` | `string[]`      | List configured disk names                |

### `StorageModuleOptions`

| Option        | Type                                  | Default        | Description               |
| ------------- | ------------------------------------- | -------------- | ------------------------- |
| `disks`       | `Record<string, StorageDriverConfig>` | —              | Named disk configurations |
| `defaultDisk` | `string`                              | First disk key | Default disk name         |

### `StoragePutOptions`

| Option     | Type                     | Description                  |
| ---------- | ------------------------ | ---------------------------- |
| `mimeType` | `string`                 | MIME type of the file        |
| `metadata` | `Record<string, string>` | Arbitrary metadata (S3 only) |

### `ImageOptions`

| Option    | Type                                                      | Default   | Description              |
| --------- | --------------------------------------------------------- | --------- | ------------------------ |
| `width`   | `number`                                                  | —         | Output width (px)        |
| `height`  | `number`                                                  | —         | Output height (px)       |
| `fit`     | `'cover' \| 'contain' \| 'fill' \| 'inside' \| 'outside'` | `'cover'` | Resize fit strategy      |
| `format`  | `'jpeg' \| 'png' \| 'webp' \| 'avif' \| 'tiff'`           | —         | Output format (converts) |
| `quality` | `number`                                                  | —         | Output quality (1–100)   |

### Driver configuration types

| Type                 | driver value | Description                       |
| -------------------- | ------------ | --------------------------------- |
| `LocalDriverConfig`  | `'local'`    | Local filesystem                  |
| `S3DriverConfig`     | `'s3'`       | S3 / S3-compatible object storage |
| `MemoryDriverConfig` | `'memory'`   | In-memory store (testing/dev)     |
| `GCSDriverConfig`    | `'gcs'`      | Google Cloud Storage              |
