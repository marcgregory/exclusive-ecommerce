import { vi } from 'vitest';

if (process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

vi.mock('./src/image-storage.js', async () => {
  const actual = await vi.importActual('./src/image-storage.js');
  return {
    ...actual,
    uploadBufferToCloudinary: vi.fn().mockResolvedValue({
      secure_url: 'http://localhost/image.jpg',
      width: 800,
      height: 600,
      bytes: 1000,
      public_id: 'test/public_id',
    }),
  };
});
