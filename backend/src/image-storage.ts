import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  v2 as cloudinary,
  type UploadApiOptions,
  type UploadApiResponse,
} from "cloudinary";
import { httpError } from "./auth.js";
import type { RuntimeConfig } from "./config.js";

export type ProductImageUpload = {
  url: string;
  key: string;
  width: number;
  height: number;
  contentType: string;
  size: number;
};

export type ProductImageStorage = {
  saveProductImage(input: {
    buffer: Buffer;
    contentType: string;
    originalName?: string;
  }): Promise<ProductImageUpload>;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIN_IMAGE_EDGE = 64;
const MAX_IMAGE_EDGE = 4096;
const MAX_IMAGE_PIXELS = 16_000_000;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const CLOUDINARY_PRODUCT_IMAGE_FOLDER = "exclusive/product-images";

const imageTypeByContentType = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function detectImageType(buffer: Buffer) {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer.toString("ascii", 1, 4) === "PNG" &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return "";
}

function pngDimensions(buffer: Buffer) {
  if (buffer.length < 24) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function jpegDimensions(buffer: Buffer) {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const size = buffer.readUInt16BE(offset + 2);
    if (size < 2) return null;
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + size;
  }
  return null;
}

function webpDimensions(buffer: Buffer) {
  const chunkType = buffer.toString("ascii", 12, 16);
  if (chunkType === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunkType === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunkType === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  return null;
}

function getImageDimensions(buffer: Buffer, contentType: string) {
  if (contentType === "image/png") return pngDimensions(buffer);
  if (contentType === "image/jpeg") return jpegDimensions(buffer);
  if (contentType === "image/webp") return webpDimensions(buffer);
  return null;
}

function validateProductImage(buffer: Buffer, contentType: string) {
  if (!buffer.length) throw httpError("Image file is required");
  if (buffer.length > MAX_IMAGE_BYTES) throw httpError("Image cannot exceed 5MB");
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw httpError("Upload a JPG, PNG, or WebP image");
  }

  const detectedType = detectImageType(buffer);
  if (detectedType !== contentType) {
    throw httpError("Image content does not match the uploaded file type");
  }

  const dimensions = getImageDimensions(buffer, contentType);
  if (!dimensions || !dimensions.width || !dimensions.height) {
    throw httpError("Image dimensions could not be read");
  }

  const { width, height } = dimensions;
  if (width < MIN_IMAGE_EDGE || height < MIN_IMAGE_EDGE) {
    throw httpError(`Image must be at least ${MIN_IMAGE_EDGE}x${MIN_IMAGE_EDGE}px`);
  }
  if (
    width > MAX_IMAGE_EDGE ||
    height > MAX_IMAGE_EDGE ||
    width * height > MAX_IMAGE_PIXELS
  ) {
    throw httpError(`Image cannot exceed ${MAX_IMAGE_EDGE}x${MAX_IMAGE_EDGE}px`);
  }

  return { width, height, contentType };
}

function safeBaseName(originalName = "product-image") {
  const parsed = path.parse(originalName);
  const base = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
  return base || "product-image";
}

export class LocalProductImageStorage implements ProductImageStorage {
  constructor(
    private readonly rootDir = path.resolve(process.cwd(), "uploads", "product-images"),
    private readonly publicBasePath = "/uploads/product-images",
  ) {}

  async saveProductImage(input: {
    buffer: Buffer;
    contentType: string;
    originalName?: string;
  }): Promise<ProductImageUpload> {
    const validated = validateProductImage(input.buffer, input.contentType);
    const now = new Date();
    const partition = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const extension = imageTypeByContentType[validated.contentType as keyof typeof imageTypeByContentType];
    const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeBaseName(input.originalName)}.${extension}`;
    const key = `${partition}/${fileName}`;
    const directory = path.join(this.rootDir, partition);
    const filePath = path.join(directory, fileName);

    await mkdir(directory, { recursive: true });
    await writeFile(filePath, input.buffer, { flag: "wx" });

    return {
      key,
      url: `${this.publicBasePath}/${key}`,
      width: validated.width,
      height: validated.height,
      contentType: validated.contentType,
      size: input.buffer.length,
    };
  }
}

export class CloudinaryProductImageStorage implements ProductImageStorage {
  constructor(
    config: RuntimeConfig["cloudinary"],
    private readonly folder = CLOUDINARY_PRODUCT_IMAGE_FOLDER,
  ) {
    cloudinary.config({
      ...(config.cloudinaryUrl ? { cloudinary_url: config.cloudinaryUrl } : {}),
      ...(config.cloudName ? { cloud_name: config.cloudName } : {}),
      ...(config.apiKey ? { api_key: config.apiKey } : {}),
      ...(config.apiSecret ? { api_secret: config.apiSecret } : {}),
      secure: true,
    });
  }

  async saveProductImage(input: {
    buffer: Buffer;
    contentType: string;
    originalName?: string;
  }): Promise<ProductImageUpload> {
    const validated = validateProductImage(input.buffer, input.contentType);
    const now = new Date();
    const partition = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const publicId = `${partition}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeBaseName(input.originalName)}`;
    const response = await uploadBufferToCloudinary(input.buffer, {
      folder: this.folder,
      public_id: publicId,
      resource_type: "image",
      overwrite: false,
    });

    return {
      key: response.public_id,
      url: response.secure_url,
      width: response.width || validated.width,
      height: response.height || validated.height,
      contentType: validated.contentType,
      size: response.bytes || input.buffer.length,
    };
  }
}

function uploadBufferToCloudinary(
  buffer: Buffer,
  options: UploadApiOptions,
) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      if (!result?.secure_url || !result.public_id) {
        return reject(new Error("Cloudinary upload did not return image URL"));
      }
      resolve(result);
    });
    stream.end(buffer);
  });
}

export function createProductImageStorage(config: RuntimeConfig): ProductImageStorage {
  if (config.imageStorageProvider === "cloudinary") {
    return new CloudinaryProductImageStorage(config.cloudinary);
  }
  return new LocalProductImageStorage();
}

export const productImageUploadsRoot = path.resolve(process.cwd(), "uploads", "product-images");
