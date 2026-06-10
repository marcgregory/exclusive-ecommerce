import { vi } from 'vitest';

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