import { loadSharp } from '../utils/loaders.js';
import type { ImageOptions } from '../storage.types.js';

/**
 * Process / transform an image buffer using `sharp`.
 *
 * Supports resize, format conversion, and quality adjustment.
 *
 * @example
 * ```typescript
 * const thumb = await processImage(original, {
 *   width: 200,
 *   height: 200,
 *   fit: 'cover',
 *   format: 'webp',
 *   quality: 80,
 * });
 * ```
 */
export async function processImage(buffer: Buffer, options: ImageOptions): Promise<Buffer> {
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
  const sharp = await loadSharp();

  let pipeline = sharp(buffer);

  if (options.width !== undefined || options.height !== undefined) {
    pipeline = pipeline.resize(options.width, options.height, {
      fit: options.fit ?? 'cover',
      withoutEnlargement: true,
    });
  }

  if (options.format) {
    switch (options.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: options.quality });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: options.quality });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: options.quality });
        break;
      case 'avif':
        pipeline = pipeline.avif({ quality: options.quality });
        break;
      case 'tiff':
        pipeline = pipeline.tiff({ quality: options.quality });
        break;
    }
  } else if (options.quality !== undefined) {
    pipeline = pipeline.jpeg({ quality: options.quality });
  }

  return pipeline.toBuffer();
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
}
