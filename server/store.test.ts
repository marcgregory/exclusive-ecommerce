import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closePool, query } from "./db.js";
import { migrate } from "./migrate.js";
import { seedDatabase } from "./seed-db.js";
import {
  addCartItem,
  addWishlistProduct,
  createContactMessage,
  createCoupon,
  createOrder,
  createProduct,
  createUser,
  deleteCartItem,
  deleteCoupon,
  deleteProduct,
  deleteWishlistProduct,
  findUserByEmail,
  getAdminOrder,
  getSessionUser,
  getUserCart,
  getWishlistProducts,
  listAdminOrders,
  listContactMessages,
  listProducts,
  setCouponActive,
  toCartResponse,
  updateCartItem,
  updateContactMessageStatus,
  updateOrderStatus,
  updateProduct,
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
    expect(await getSessionUser({})).toBeUndefined();
    expect(await getSessionUser({ session: { userId: "demo-user" } })).toMatchObject({ id: "demo-user", email: "rimel@example.com" });
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

    expect(user.role).toBe("customer");
    expect(await findUserByEmail("ADA@example.com")).toMatchObject({ id: user.id, role: "customer" });

    const updated = await updateUser(user.id, { address: "New address" });
    expect(updated).toMatchObject({ address: "New address", email: "ada@example.com", role: "customer" });
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

  it("exposes role on the session user", async () => {
    const adminSession = await getSessionUser({ session: { userId: "demo-user" } });
    expect(adminSession).toMatchObject({ role: "admin" });
  });

  it("creates, updates, and deletes products via the admin repo", async () => {
    const product = await createProduct({
      name: "Test Drone",
      category: "electronics",
      description: "Quadcopter with HD camera",
      price: 199,
      originalPrice: 249,
      discountPercent: 20,
      rating: 4.5,
      reviewCount: 12,
      stockStatus: "In Stock",
      colors: ["#111111"],
      sizes: [],
      isNew: true,
      flags: ["flash"],
      image: "drone"
    });

    expect(product).toMatchObject({ name: "Test Drone", price: 199, isNew: true });
    const found = await query("SELECT * FROM products WHERE id = $1", [product.id]);
    expect(found.rows[0].image_key).toBe("drone");

    const updated = await updateProduct(product.id, { price: 150, stockStatus: "Out of Stock" });
    expect(updated).toMatchObject({ price: 150, stockStatus: "Out of Stock" });

    expect(await deleteProduct(product.id)).toBe(true);
    expect(await deleteProduct(product.id)).toBe(false);
  });

  it("advances order status through valid transitions", async () => {
    const order = await createOrder(
      "demo-user",
      { firstName: "Md", streetAddress: "1 St", townCity: "Dhaka", phone: "1", email: "rimel@example.com" },
      "bank"
    );

    const shipped = await updateOrderStatus(order.id, "shipped");
    expect(shipped).toMatchObject({ id: order.id, status: "shipped" });

    const fetched = await getAdminOrder(order.id);
    expect(fetched).toMatchObject({ id: order.id, status: "shipped", customerEmail: "rimel@example.com" });

    await expect(updateOrderStatus(order.id, "nope")).rejects.toThrow("Invalid order status");
  });

  it("filters admin order listings by status and email", async () => {
    await createOrder("demo-user", { firstName: "Md", streetAddress: "1 St", townCity: "Dhaka", phone: "1", email: "rimel@example.com" }, "bank");
    const all = await listAdminOrders();
    expect(all.orders).toHaveLength(1);

    const filtered = await listAdminOrders({ status: "processing" });
    expect(filtered.orders).toHaveLength(1);

    const empty = await listAdminOrders({ email: "nobody@example.com" });
    expect(empty.orders).toHaveLength(0);
    expect(empty.total).toBe(0);
  });

  it("soft-toggles and creates coupons", async () => {
    const created = await createCoupon({ code: "SUMMER25", type: "percent", amount: 25, active: true });
    expect(created).toMatchObject({ code: "SUMMER25", amount: 25, active: true });

    const toggled = await setCouponActive("SUMMER25", false);
    expect(toggled).toMatchObject({ code: "SUMMER25", active: false });
    expect(await validateCoupon("SUMMER25")).toBeNull();

    expect(await deleteCoupon("SUMMER25")).toBe(true);
    expect(await deleteCoupon("SUMMER25")).toBe(false);
  });

  it("lists and updates contact message status", async () => {
    const message = await createContactMessage({ name: "Ada", email: "ada@example.com", phone: "555", message: "Hi" });
    const listed = await listContactMessages({ status: "new" });
    expect(listed.messages.map((m) => m.id)).toContain(message.id);

    const updated = await updateContactMessageStatus(message.id, "replied");
    expect(updated).toMatchObject({ id: message.id, status: "replied" });
  });
});
