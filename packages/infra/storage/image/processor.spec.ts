import type { ImageOptions } from '../storage.types.js';

// ──────── Mock sharp ────────

const mockToBuffer = jest.fn().mockResolvedValue(Buffer.from('processed'));

const mockJpeg = jest.fn().mockReturnThis();
const mockPng = jest.fn().mockReturnThis();
const mockWebp = jest.fn().mockReturnThis();
const mockAvif = jest.fn().mockReturnThis();
const mockTiff = jest.fn().mockReturnThis();
const mockResize = jest.fn().mockReturnThis();

const mockSharp = jest.fn(() => ({
  resize: mockResize,
  jpeg: mockJpeg,
  png: mockPng,
  webp: mockWebp,
  avif: mockAvif,
  tiff: mockTiff,
  toBuffer: mockToBuffer,
})) as jest.Mock;

jest.mock('../utils/loaders', () => ({
  loadSharp: jest.fn().mockResolvedValue(mockSharp),
}));

import { processImage } from './processor.js';

beforeEach(() => {
  jest.clearAllMocks();
});

// ──────── Tests ────────

describe('processImage', () => {
  const input = Buffer.from('fake-image');

  it('should call sharp with the input buffer', async () => {
    await processImage(input, {});
    expect(mockSharp).toHaveBeenCalledWith(input);
  });

  it('should call toBuffer', async () => {
    await processImage(input, {});
    expect(mockToBuffer).toHaveBeenCalled();
  });

  it('should return the processed buffer', async () => {
    const result = await processImage(input, {});
    expect(result).toEqual(Buffer.from('processed'));
  });

  describe('resize', () => {
    it('should resize when width is provided', async () => {
      await processImage(input, { width: 200 } as ImageOptions);
      expect(mockResize).toHaveBeenCalledWith(200, undefined, {
        fit: 'cover',
        withoutEnlargement: true,
      });
    });

    it('should resize when height is provided', async () => {
      await processImage(input, { height: 300 } as ImageOptions);
      expect(mockResize).toHaveBeenCalledWith(undefined, 300, {
        fit: 'cover',
        withoutEnlargement: true,
      });
    });

    it('should pass custom fit', async () => {
      await processImage(input, { width: 200, height: 200, fit: 'contain' });
      expect(mockResize).toHaveBeenCalledWith(200, 200, {
        fit: 'contain',
        withoutEnlargement: true,
      });
    });

    it('should not resize when no width or height', async () => {
      await processImage(input, {});
      expect(mockResize).not.toHaveBeenCalled();
    });
  });

  describe('format conversion', () => {
    it.each(['jpeg', 'png', 'webp', 'avif', 'tiff'] as const)(
      'should convert to %s',
      async (format) => {
        const methodMap = {
          jpeg: mockJpeg,
          png: mockPng,
          webp: mockWebp,
          avif: mockAvif,
          tiff: mockTiff,
        };

        await processImage(input, { format, quality: 80 });
        expect(methodMap[format]).toHaveBeenCalledWith({ quality: 80 });
      },
    );
  });

  describe('quality', () => {
    it('should default to jpeg quality when format is not specified', async () => {
      await processImage(input, { quality: 75 });
      expect(mockJpeg).toHaveBeenCalledWith({ quality: 75 });
    });
  });
});
