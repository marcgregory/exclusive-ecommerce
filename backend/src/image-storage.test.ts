import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { cloudinaryConfig, cloudinaryUploadStream } = vi.hoisted(() => ({
  cloudinaryConfig: vi.fn(),
  cloudinaryUploadStream: vi.fn(),
}));

vi.mock('cloudinary', () => ({
  v2: {
    config: cloudinaryConfig,
    uploader: {
      upload_stream: cloudinaryUploadStream,
    },
  },
}));

import {
  CloudinaryProductImageStorage,
  createProductImageStorage,
  LocalProductImageStorage,
} from './image-storage.js';
import type { RuntimeConfig } from './config.js';

let tempDirs: string[] = [];

function pngBuffer(width: number, height: number) {
  const buffer = Buffer.alloc(33);
  buffer.writeUInt8(0x89, 0);
  buffer.write('PNG', 1, 'ascii');
  buffer.writeUInt8(0x0d, 4);
  buffer.writeUInt8(0x0a, 5);
  buffer.writeUInt8(0x1a, 6);
  buffer.writeUInt8(0x0a, 7);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer.writeUInt8(8, 24);
  buffer.writeUInt8(2, 25);
  buffer.writeUInt8(0, 26);
  buffer.writeUInt8(0, 27);
  buffer.writeUInt8(0, 28);
  return buffer;
}

async function createStorage() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'exclusive-images-'));
  tempDirs.push(root);
  return { root, storage: new LocalProductImageStorage(root, '/uploads/product-images') };
}

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { force: true, recursive: true })));
  tempDirs = [];
});

beforeEach(() => {
  cloudinaryConfig.mockReset();
  cloudinaryUploadStream.mockReset();
});

describe('LocalProductImageStorage', () => {
  it('stores a validated product image and returns a storefront-compatible URL', async () => {
    const { root, storage } = await createStorage();
    const upload = await storage.saveProductImage({
      buffer: pngBuffer(800, 600),
      contentType: 'image/png',
      originalName: 'Studio Product Shot.png',
    });

    expect(upload).toMatchObject({
      width: 800,
      height: 600,
      contentType: 'image/png',
      size: 33,
    });
    expect(upload.key).toMatch(/^\d{4}\/\d{2}\/\d+-[a-f0-9-]+-studio-product-shot\.png$/);
    expect(upload.url).toBe(`/uploads/product-images/${upload.key}`);
    await expect(readFile(path.join(root, upload.key))).resolves.toEqual(pngBuffer(800, 600));
  });

  it('rejects mismatched content types', async () => {
    const { storage } = await createStorage();

    await expect(
      storage.saveProductImage({
        buffer: pngBuffer(800, 600),
        contentType: 'image/jpeg',
        originalName: 'fake.jpg',
      })
    ).rejects.toThrow('does not match');
  });

  it('rejects images that are too small for product cards', async () => {
    const { storage } = await createStorage();

    await expect(
      storage.saveProductImage({
        buffer: pngBuffer(48, 48),
        contentType: 'image/png',
      })
    ).rejects.toThrow('at least 64x64');
  });
});

describe('createProductImageStorage', () => {
  it('uses local image storage by default', () => {
    expect(
      createProductImageStorage({
        cloudinary: {},
        databaseUrl: 'postgres://example/test',
        imageStorageProvider: 'local',
        isProduction: false,
        nodeEnv: 'test',
        paymentProvider: 'local',
        port: 4000,
        sessionSecret: 'test-session-secret-with-at-least-32-chars',
        webOrigins: ['http://127.0.0.1:5173'],
      } satisfies RuntimeConfig)
    ).toBeInstanceOf(LocalProductImageStorage);
  });
});

describe('CloudinaryProductImageStorage', () => {
  it('returns the Cloudinary HTTPS URL and public id from a mocked upload response', async () => {
    cloudinaryUploadStream.mockImplementation((options, callback) => ({
      end: (buffer: Buffer) => {
        callback(null, {
          public_id: 'exclusive/product-images/2026/06/uploaded-keyboard',
          secure_url:
            'https://res.cloudinary.com/demo/image/upload/v1/exclusive/product-images/2026/06/uploaded-keyboard.png',
          width: 800,
          height: 600,
          bytes: buffer.length,
        });
      },
    }));
    const storage = new CloudinaryProductImageStorage({
      cloudName: 'demo',
      apiKey: 'key',
      apiSecret: 'secret',
    });

    const upload = await storage.saveProductImage({
      buffer: pngBuffer(800, 600),
      contentType: 'image/png',
      originalName: 'Keyboard.png',
    });

    expect(cloudinaryConfig).toHaveBeenCalledWith({
      cloud_name: 'demo',
      api_key: 'key',
      api_secret: 'secret',
      secure: true,
    });
    expect(cloudinaryUploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: 'exclusive/product-images',
        overwrite: false,
        public_id: expect.stringMatching(/^\d{4}\/\d{2}\/\d+-[a-f0-9-]+-keyboard$/),
        resource_type: 'image',
      }),
      expect.any(Function)
    );
    expect(upload).toEqual({
      key: 'exclusive/product-images/2026/06/uploaded-keyboard',
      url: 'https://res.cloudinary.com/demo/image/upload/v1/exclusive/product-images/2026/06/uploaded-keyboard.png',
      width: 800,
      height: 600,
      contentType: 'image/png',
      size: 33,
    });
  });

  it('validates images before uploading to Cloudinary', async () => {
    const storage = new CloudinaryProductImageStorage({
      cloudinaryUrl: 'cloudinary://key:secret@demo',
    });

    await expect(
      storage.saveProductImage({
        buffer: pngBuffer(800, 600),
        contentType: 'image/jpeg',
      })
    ).rejects.toThrow('does not match');
    expect(cloudinaryUploadStream).not.toHaveBeenCalled();
  });

  it('surfaces Cloudinary upload failures', async () => {
    cloudinaryUploadStream.mockImplementation((_options, callback) => ({
      end: () => {
        callback(new Error('Cloudinary is unavailable'));
      },
    }));
    const storage = new CloudinaryProductImageStorage({
      cloudinaryUrl: 'cloudinary://key:secret@demo',
    });

    await expect(
      storage.saveProductImage({
        buffer: pngBuffer(800, 600),
        contentType: 'image/png',
      })
    ).rejects.toThrow('Cloudinary is unavailable');
  });
});
