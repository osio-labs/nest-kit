import { loadSharp, loadS3Client, loadS3Presigner, loadGCS } from './loaders.js';

describe('loadSharp', () => {
  it('should throw friendly error when sharp is not installed', async () => {
    await expect(loadSharp()).rejects.toThrow('Cannot find module "sharp"');
  });
});

describe('loadS3Client', () => {
  it('should throw friendly error when @aws-sdk/client-s3 is not installed', async () => {
    await expect(loadS3Client()).rejects.toThrow('Cannot find module "@aws-sdk/client-s3"');
  });
});

describe('loadS3Presigner', () => {
  it('should throw friendly error when @aws-sdk/s3-request-presigner is not installed', async () => {
    await expect(loadS3Presigner()).rejects.toThrow(
      'Cannot find module "@aws-sdk/s3-request-presigner"',
    );
  });
});

describe('loadGCS', () => {
  it('should throw friendly error when @google-cloud/storage is not installed', async () => {
    await expect(loadGCS()).rejects.toThrow('Cannot find module "@google-cloud/storage"');
  });
});
