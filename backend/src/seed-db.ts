import { config as dotenvConfig } from "dotenv";
import { closePool, query, withTransaction } from "./db.js";
import { createInitialStore } from "./seed.js";
import { pathToFileURL, fileURLToPath } from "node:url";
import { loadRuntimeConfig } from "./config.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { uploadBufferToCloudinary, detectImageType } from "./image-storage.js";

export async function seedDatabase(): Promise<void> {
  const state = createInitialStore();
  const __filename = fileURLToPath(import.meta.url);
  const backendDir = resolve(__filename, "..");
  const dotenvResult = dotenvConfig({ path: resolve(backendDir, ".env.production") });
  console.log(`Loaded env from: .env.production`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  const config = loadRuntimeConfig();
  console.log(
    `Cloudinary config:`,
    JSON.stringify(
      {
        cloudinaryUrl: config.cloudinary.cloudinaryUrl ? "[SET]" : "[NOT SET]",
        cloudName: config.cloudinary.cloudName ? "[SET]" : "[NOT SET]",
        apiKey: config.cloudinary.apiKey ? "[SET]" : "[NOT SET]",
        apiSecret: config.cloudinary.apiSecret ? "[SET]" : "[NOT SET]",
      },
      null,
      2
    )
  );
  // Check if Cloudinary credentials are available (skip in test)
  if (process.env.NODE_ENV !== "test") {
    if (!config.cloudinary.cloudinaryUrl && !(config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret)) {
      throw new Error("Cloudinary credentials are not available. Please check your environment variables.");
    }

    // Configure cloudinary
    cloudinary.config({
      ...(config.cloudinary.cloudinaryUrl ? { cloudinary_url: config.cloudinary.cloudinaryUrl } : {}),
      ...(config.cloudinary.cloudName ? { cloud_name: config.cloudinary.cloudName } : {}),
      ...(config.cloudinary.apiKey ? { api_key: config.cloudinary.apiKey } : {}),
      ...(config.cloudinary.apiSecret ? { api_secret: config.cloudinary.apiSecret } : {}),
      secure: true,
    });
  }

  await withTransaction(async (client) => {
    await client.query(
      "TRUNCATE stripe_webhook_events, contact_messages, order_items, orders, wishlist_items, wishlists, cart_items, carts, coupons, product_variants, product_images, products, categories, users RESTART IDENTITY CASCADE"
    );

    for (const user of state.users) {
      await client.query(
        "INSERT INTO users (id, first_name, last_name, email, address, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [user.id, user.firstName, user.lastName, user.email, user.address, user.passwordHash, user.role ?? "customer"]
      );
    }

    for (const [index, category] of state.categories.entries()) {
      await client.query(
        "INSERT INTO categories (id, label, slug, icon, children, sort_order) VALUES ($1, $2, $3, $4, $5::jsonb, $6)",
        [category.id, category.label, category.slug, category.icon, JSON.stringify(category.children), index]
      );
    }

    for (const [index, product] of state.products.entries()) {
      // Read the image file
      const imagePath = resolve(process.cwd(), '..', 'frontend', 'public', product.image.replace(/^\//, ''));
      const imageBuffer = await readFile(imagePath);
      // Detect content type
      const contentType = detectImageType(imageBuffer);
      if (!contentType) {
        throw new Error(`Could not detect image type for ${product.image}`);
      }
      // Prepare the public_id based on product slug (we'll use product.id as slug)
      const publicId = product.id; // e.g., "havic-gamepad"
      let secureUrl: string;
      if (process.env.NODE_ENV === "test") {
        // Mock Cloudinary upload in test environment
        secureUrl = `https://res.cloudinary.com/test/image/upload/mock-${publicId}.jpg`;
      } else {
        // Upload to Cloudinary
        const uploadResult = await uploadBufferToCloudinary(imageBuffer, {
          folder: "exclusive/product-images",
          public_id: publicId,
          overwrite: true,
          resource_type: "image",
        });
        secureUrl = uploadResult.secure_url;
      }

      await client.query(
        `INSERT INTO products (
          id, name, category_id, description, price, original_price, discount_percent,
          rating, review_count, stock_status, colors, sizes, is_new, image_key, flags, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          product.id,
          product.name,
          product.category,
          product.description,
          product.price,
          product.originalPrice,
          product.discountPercent,
          product.rating,
          product.reviewCount,
          product.stockStatus,
          product.colors,
          product.sizes,
          product.isNew,
          secureUrl, // <-- use the Cloudinary URL instead of the local path
          product.flags,
          index
        ]
      );

      const colors = product.colors.length ? product.colors : [""];
      const sizes = product.sizes.length ? product.sizes : [""];
      for (const color of colors) {
        for (const size of sizes) {
          await client.query(
            "INSERT INTO product_variants (id, product_id, color, size, stock) VALUES ($1, $2, $3, $4, $5)",
            [`pv-${product.id}-${color || "default"}-${size || "default"}`, product.id, color, size, product.stockStatus === "Out of Stock" ? 0 : 10]
          );
        }
      }
    }

    for (const coupon of state.coupons) {
      await client.query("INSERT INTO coupons (code, type, amount, active) VALUES ($1, $2, $3, $4)", [coupon.code, coupon.type, coupon.amount, coupon.active]);
    }

    for (const cart of state.carts) {
      await client.query("INSERT INTO carts (id, user_id) VALUES ($1, $2)", [cart.id, cart.userId]);
      for (const item of cart.items) {
        await client.query(
          "INSERT INTO cart_items (id, cart_id, product_id, quantity, selected_color, selected_size) VALUES ($1, $2, $3, $4, $5, $6)",
          [item.id, cart.id, item.productId, item.quantity, item.selectedColor, item.selectedSize]
        );
      }
    }

    for (const wishlist of state.wishlists) {
      const wishlistId = `wishlist-${wishlist.userId}`;
      await client.query("INSERT INTO wishlists (id, user_id) VALUES ($1, $2)", [wishlistId, wishlist.userId]);
      for (const productId of wishlist.productIds) {
        await client.query("INSERT INTO wishlist_items (wishlist_id, product_id) VALUES ($1, $2)", [wishlistId, productId]);
      }
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDatabase()
    .then(async () => {
      await closePool();
      console.log("Database seed complete");
    })
    .catch(async (error) => {
      await closePool();
      console.error(error);
      process.exitCode = 1;
    });
}
