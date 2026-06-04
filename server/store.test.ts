import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closePool, query } from "./db.js";
import { migrate } from "./migrate.js";
import { seedDatabase } from "./seed-db.js";
import {
  addCartItem,
  addWishlistProduct,
  createContactMessage,
  createOrder,
  createUser,
  deleteCartItem,
  deleteWishlistProduct,
  findUserByEmail,
  getSessionUser,
  getUserCart,
  getWishlistProducts,
  listProducts,
  toCartResponse,
  updateCartItem,
  updateUser,
  validateCoupon
} from "./store.js";

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL is required for PostgreSQL persistence tests");
  }
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  await migrate();
  return async () => {
    await closePool();
  };
});

beforeEach(async () => {
  await seedDatabase();
});

describe("PostgreSQL persistence", () => {
  it("runs migrations and seeds catalog data", async () => {
    const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('products', 'categories', 'coupons', 'users')");
    expect(tables.rows).toHaveLength(4);

    const products = await listProducts();
    expect(products.total).toBeGreaterThan(0);
    expect(await validateCoupon("EXCLUSIVE10")).toMatchObject({ code: "EXCLUSIVE10", active: true });
    expect(await getSessionUser({})).toMatchObject({ id: "demo-user", email: "rimel@example.com" });
  });

  it("filters, searches, sorts, and paginates products", async () => {
    const electronics = await listProducts({ category: "electronics", flag: "best", sort: "price-desc", page: 1, limit: 2 });

    expect(electronics.products).toHaveLength(2);
    expect(electronics.products.every((product) => product.category === "electronics" && product.flags.includes("best"))).toBe(true);
    expect(electronics.products[0].price).toBeGreaterThanOrEqual(electronics.products[1].price);

    const search = await listProducts({ q: "keyboard" });
    expect(search.products.map((product) => product.id)).toContain("ak-keyboard");
  });

  it("calculates cart totals from repository-backed products and coupons", async () => {
    const cart = {
      id: "test-cart",
      userId: "demo-user",
      items: [
        { id: "item-1", productId: "havic-gamepad", quantity: 2, selectedColor: "#db4444", selectedSize: "M" },
        { id: "item-2", productId: "rgb-cooler", quantity: 1, selectedColor: "#111111", selectedSize: "" }
      ]
    };

    const result = await toCartResponse(cart, "EXCLUSIVE10");

    expect(result.subtotal).toBe(400);
    expect(result.discount).toBe(40);
    expect(result.shipping).toBe(16);
    expect(result.total).toBe(376);
    expect(result.items).toHaveLength(2);
  });

  it("creates, updates, and deletes cart items", async () => {
    const added = await addCartItem("demo-user", { productId: "rgb-cooler", quantity: 2, selectedColor: "#111111", selectedSize: "" });
    const item = added.items.find((entry) => entry.productId === "rgb-cooler");
    expect(item?.quantity).toBe(2);

    const updated = await updateCartItem("demo-user", item!.id, 3);
    expect(updated?.items.find((entry) => entry.id === item!.id)?.quantity).toBe(3);

    const deleted = await deleteCartItem("demo-user", item!.id);
    expect(deleted.items.some((entry) => entry.id === item!.id)).toBe(false);
  });

  it("adds, lists, and removes wishlist products", async () => {
    const added = await addWishlistProduct("demo-user", "havic-gamepad");
    expect(added.map((product) => product.id)).toContain("havic-gamepad");

    const listed = await getWishlistProducts("demo-user");
    expect(listed.map((product) => product.id)).toContain("havic-gamepad");

    const removed = await deleteWishlistProduct("demo-user", "havic-gamepad");
    expect(removed.map((product) => product.id)).not.toContain("havic-gamepad");
  });

  it("creates and updates users", async () => {
    const user = await createUser({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      address: "London",
      passwordHash: "hashed"
    });

    expect(await findUserByEmail("ADA@example.com")).toMatchObject({ id: user.id });

    const updated = await updateUser(user.id, { address: "New address" });
    expect(updated).toMatchObject({ address: "New address", email: "ada@example.com" });
  });

  it("creates orders transactionally and clears the cart", async () => {
    const order = await createOrder(
      "demo-user",
      { firstName: "Md", streetAddress: "123 Main", townCity: "Dhaka", phone: "123", email: "rimel@example.com" },
      "bank",
      "EXCLUSIVE10"
    );

    expect(order.items).toHaveLength(1);
    expect(order.total).toBe(232);
    expect((await getUserCart("demo-user")).items).toHaveLength(0);
  });

  it("persists contact submissions with API-shaped fields", async () => {
    const message = await createContactMessage({ name: "Ada", email: "ada@example.com", phone: "", message: "Hello" });

    expect(message).toMatchObject({ name: "Ada", email: "ada@example.com", status: "new" });
    expect(message.createdAt).toEqual(expect.any(String));
  });
});
