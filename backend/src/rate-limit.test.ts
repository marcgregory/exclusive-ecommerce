import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const noop = vi.fn();

function mockStore() {
  return {
    addCartItem: noop,
    addWishlistProduct: noop,
    createContactMessage: noop,
    createCoupon: noop,
    createCategory: noop,
    createOrder: noop,
    createProduct: noop,
    createUser: noop,
    deleteCartItem: noop,
    deleteCategory: noop,
    deleteCoupon: noop,
    deleteProduct: noop,
    deleteWishlistProduct: noop,
    findProduct: noop,
    findUserByEmail: vi.fn().mockResolvedValue(undefined),
    getAdminOrder: noop,
    getOrder: noop,
    getRelatedProducts: noop,
    getSessionUser: vi
      .fn()
      .mockResolvedValue({ id: "admin-1", role: "admin" }),
    getUserCart: noop,
    getWishlistProducts: noop,
    listAdminOrders: noop,
    listCategories: noop,
    listContactMessages: noop,
    listOrders: noop,
    listProducts: noop,
    loadStore: noop,
    publicUser: vi.fn((user) => user),
    toCartResponse: noop,
    updateAdminOrder: vi.fn().mockResolvedValue(undefined),
    updateCartItem: noop,
    updateCategory: noop,
    updateContactMessageStatus: noop,
    updateCoupon: noop,
    updateOrderStatus: noop,
    updateProduct: noop,
    updateUser: noop,
    validateCoupon: noop,
  };
}

async function importRateLimitedApp() {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DISABLE_RATE_LIMIT_BYPASS = "true";
  process.env.DATABASE_URL = "postgres://example/test";
  process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-chars";
  vi.doMock("./db.js", () => ({
    closePool: vi.fn(),
    query: vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }),
  }));
  vi.doMock("./store.js", mockStore);
  const { default: app } = await import("./index.js");
  return app;
}

describe("rate limit behavior", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.doUnmock("./db.js");
    vi.doUnmock("./store.js");
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it("returns 429 for auth attempts when test bypass is disabled", async () => {
    const app = await importRateLimitedApp();
    let res: request.Response | undefined;

    for (let i = 0; i < 11; i++) {
      res = await request(app)
        .post("/api/auth/login")
        .send({ email: `bad-${i}@example.com`, password: "password123" });
    }

    expect(res?.status).toBe(429);
    expect(res?.body).toMatchObject({
      message: "Too many attempts. Try again later.",
    });
  });

  it("returns 429 for contact submissions when test bypass is disabled", async () => {
    const app = await importRateLimitedApp();
    let res: request.Response | undefined;

    for (let i = 0; i < 6; i++) {
      res = await request(app).post("/api/contact").send({});
    }

    expect(res?.status).toBe(429);
    expect(res?.body).toMatchObject({
      message: "Too many messages. Please try again later.",
    });
  });

  it("returns 429 for admin writes when test bypass is disabled", async () => {
    const app = await importRateLimitedApp();
    let res: request.Response | undefined;

    for (let i = 0; i < 31; i++) {
      res = await request(app)
        .patch(`/api/admin/orders/missing-${i}`)
        .send({ internalNote: "Non-mutating limiter probe" });
    }

    expect(res?.status).toBe(429);
    expect(res?.body).toMatchObject({
      message: "Too many admin actions. Try again in a minute.",
    });
  });
});
