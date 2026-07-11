import { loadS3Client, loadS3Presigner } from '../utils/loaders.js';
import type { StorageDriver, S3DriverConfig } from '../storage.types.js';

/**
 * Create an S3 / S3-compatible storage driver.
 *
 * Supports AWS S3, MinIO, Cloudflare R2, Backblaze B2, and any
 * other S3-compatible object store.
 */
export async function createS3Driver(config: S3DriverConfig): Promise<StorageDriver> {
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
  const s3 = await loadS3Client();

  const client = new s3.S3Client({
    region: config.region ?? 'us-east-1',
    endpoint: config.endpoint,
    credentials: config.credentials,
    forcePathStyle: config.forcePathStyle,
  });

  const bucket = config.bucket;

  const put: StorageDriver['put'] = async (key, body, options) => {
    const cmd = new s3.PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: options?.mimeType,
      Metadata: options?.metadata,
    });
    await client.send(cmd);
    return key;
  };

  const get: StorageDriver['get'] = async (key) => {
    const cmd = new s3.GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await client.send(cmd);
    const bytes = await response.Body!.transformToByteArray();
    return Buffer.from(bytes);
  };

  const del: StorageDriver['delete'] = async (key) => {
    const cmd = new s3.DeleteObjectCommand({ Bucket: bucket, Key: key });
    await client.send(cmd);
  };

  const exists: StorageDriver['exists'] = async (key) => {
    try {
      const cmd = new s3.HeadObjectCommand({ Bucket: bucket, Key: key });
      await client.send(cmd);
      return true;
    } catch (err: unknown) {
      const s3Err = err as { name?: string };
      if (s3Err.name === 'NotFound') return false;
      throw err;
    }
  };

  const url: StorageDriver['url'] = (key) => {
    if (config.baseUrl) {
      const separator = config.baseUrl.endsWith('/') ? '' : '/';
      return `${config.baseUrl}${separator}${key}`;
    }
    const region = config.region ?? 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  };

  const signedUrl: StorageDriver['signedUrl'] = async (key, expiresIn = 3600) => {
    const presigner = await loadS3Presigner();
    const cmd = new s3.GetObjectCommand({ Bucket: bucket, Key: key });
    return presigner.getSignedUrl(client, cmd, { expiresIn });
  };

  const copy: StorageDriver['copy'] = async (from, to) => {
    const cmd = new s3.CopyObjectCommand({
      Bucket: bucket,
      CopySource: `/${bucket}/${from}`,
      Key: to,
    });
    await client.send(cmd);
  };

  const move: StorageDriver['move'] = async (from, to) => {
    await copy(from, to);
    await del(from);
  };

  const list: StorageDriver['list'] = async (prefix?: string) => {
    const cmd = new s3.ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });
    const response = await client.send(cmd);
    return (response.Contents ?? []).map((obj: any) => obj.Key as string);
  };

  return { put, get, delete: del, exists, url, signedUrl, copy, move, list };
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
}
