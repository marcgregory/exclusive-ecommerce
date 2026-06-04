import { closePool, query, withTransaction } from "./db.js";
import { createInitialStore } from "./seed.js";
import { pathToFileURL } from "node:url";

export async function seedDatabase(): Promise<void> {
  const state = createInitialStore();

  await withTransaction(async (client) => {
    await client.query(
      "TRUNCATE contact_messages, order_items, orders, wishlist_items, wishlists, cart_items, carts, coupons, product_variants, product_images, products, categories, users RESTART IDENTITY CASCADE"
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
          product.image,
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
