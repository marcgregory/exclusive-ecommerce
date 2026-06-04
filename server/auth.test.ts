import bcrypt from "bcryptjs";
import { describe, expect, it, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import {
  DEV_SESSION_SECRET,
  getSessionSecret,
  normalizeEmail,
  validateLoginInput,
  validateProfileInput,
  validateRegisterInput,
} from "./auth.js";
import type { User } from "./types.js";
import { closePool } from "./db.js";
import { migrate } from "./migrate.js";
import { seedDatabase } from "./seed-db.js";

let testApp: any;

const user = async (overrides: Partial<User> = {}): Promise<User> => ({
  id: "user-1",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  address: "London",
  passwordHash: await bcrypt.hash("oldpassword", 10),
  role: "customer",
  ...overrides,
});

describe("auth validation", () => {
  it("normalizes email input", () => {
    expect(normalizeEmail(" ADA@Example.COM ")).toBe("ada@example.com");
  });

  it("validates registration email, password length, and confirmation", () => {
    expect(() =>
      validateRegisterInput({
        email: "bad",
        password: "password1",
        confirmPassword: "password1",
      }),
    ).toThrow("valid email");
    expect(() =>
      validateRegisterInput({
        email: "ada@example.com",
        password: "short",
        confirmPassword: "short",
      }),
    ).toThrow("at least 8");
    expect(() =>
      validateRegisterInput({
        email: "ada@example.com",
        password: "password1",
        confirmPassword: "password2",
      }),
    ).toThrow("does not match");

    expect(
      validateRegisterInput({
        email: " ADA@Example.COM ",
        password: "password1",
        confirmPassword: "password1",
      }),
    ).toMatchObject({
      email: "ada@example.com",
    });
  });

  it("validates login email shape and required password", () => {
    expect(() =>
      validateLoginInput({ email: "ada@example.com", password: "" }),
    ).toThrow("required");
    expect(() =>
      validateLoginInput({ email: "bad", password: "password1" }),
    ).toThrow("valid email");
    expect(
      validateLoginInput({ email: " ADA@Example.COM ", password: "password1" }),
    ).toEqual({
      email: "ada@example.com",
      password: "password1",
    });
  });

  it("rejects duplicate profile emails owned by another user", async () => {
    const current = await user();

    await expect(
      validateProfileInput(
        { email: "grace@example.com" },
        current,
        async () => ({
          ...(await user()),
          id: "user-2",
          email: "grace@example.com",
        }),
      ),
    ).rejects.toThrow("Email already registered");
  });

  it("preserves unspecified profile fields and validates password changes", async () => {
    const current = await user();

    await expect(
      validateProfileInput(
        { newPassword: "newpassword", confirmPassword: "newpassword" },
        current,
        async () => undefined,
      ),
    ).rejects.toThrow("Current password");
    await expect(
      validateProfileInput(
        {
          currentPassword: "wrongpass",
          newPassword: "newpassword",
          confirmPassword: "newpassword",
        },
        current,
        async () => undefined,
      ),
    ).rejects.toThrow("incorrect");
    await expect(
      validateProfileInput(
        {
          currentPassword: "oldpassword",
          newPassword: "newpass1",
          confirmPassword: "newpass2",
        },
        current,
        async () => undefined,
      ),
    ).rejects.toThrow("does not match");

    const updates = await validateProfileInput(
      { address: "New address" },
      current,
      async () => undefined,
    );
    expect(updates).toEqual({ address: "New address" });
  });

  it("requires stronger session secrets in production", () => {
    expect(
      getSessionSecret({ NODE_ENV: "development" } as NodeJS.ProcessEnv),
    ).toBe(DEV_SESSION_SECRET);
    expect(() =>
      getSessionSecret({
        NODE_ENV: "production",
        SESSION_SECRET: "short",
      } as NodeJS.ProcessEnv),
    ).toThrow("SESSION_SECRET");
    expect(
      getSessionSecret({
        NODE_ENV: "production",
        SESSION_SECRET: "a".repeat(32),
      } as NodeJS.ProcessEnv),
    ).toBe("a".repeat(32));
  });
});

describe("auth endpoints", () => {
  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL) {
      throw new Error("TEST_DATABASE_URL is required for auth endpoint tests");
    }
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    await migrate();
    const { default: app } = await import("./index.js");
    testApp = app;
    return async () => {
      await closePool();
    };
  });

  beforeEach(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await closePool();
  });

  describe("POST /api/auth/register", () => {
    it("creates a new user and returns 201 with user data", async () => {
      const res = await request(testApp).post("/api/auth/register").send({
        email: "newuser@example.com",
        password: "password123",
        confirmPassword: "password123",
        firstName: "New",
        lastName: "User",
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({
        email: "newuser@example.com",
        firstName: "New",
      });
      expect(res.body.user.id).toBeDefined();
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("rejects duplicate email with 409", async () => {
      await request(testApp).post("/api/auth/register").send({
        email: "newuser@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      const res = await request(testApp).post("/api/auth/register").send({
        email: "newuser@example.com",
        password: "password456",
        confirmPassword: "password456",
      });

      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({
        message: expect.stringContaining("already registered"),
      });
    });

    it("rejects invalid email with 400", async () => {
      const res = await request(testApp).post("/api/auth/register").send({
        email: "bad",
        password: "password123",
        confirmPassword: "password123",
      });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        message: expect.stringContaining("valid email"),
      });
    });

    it("rejects short password with 400", async () => {
      const res = await request(testApp).post("/api/auth/register").send({
        email: "user@example.com",
        password: "short",
        confirmPassword: "short",
      });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        message: expect.stringContaining("at least 8"),
      });
    });

    it("rejects mismatched passwords with 400", async () => {
      const res = await request(testApp).post("/api/auth/register").send({
        email: "user@example.com",
        password: "password123",
        confirmPassword: "password456",
      });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        message: expect.stringContaining("does not match"),
      });
    });

    it("sets session cookie on successful registration", async () => {
      const res = await request(testApp).post("/api/auth/register").send({
        email: "cookie@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      expect(res.status).toBe(201);
      const setCookie = res.headers["set-cookie"];
      const cookies = Array.isArray(setCookie)
        ? setCookie
        : setCookie
          ? [setCookie]
          : [];
      expect(cookies).toContainEqual(expect.stringContaining("exclusive.sid"));
    });
  });

  describe("POST /api/auth/login", () => {
    it("authenticates user and sets session cookie", async () => {
      // Create a user first so we know the password
      await request(testApp).post("/api/auth/register").send({
        email: "testlogin@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      const res = await request(testApp)
        .post("/api/auth/login")
        .send({ email: "testlogin@example.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ email: "testlogin@example.com" });
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("rejects invalid email with 401", async () => {
      const res = await request(testApp)
        .post("/api/auth/login")
        .send({ email: "wrong@example.com", password: "password" });

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        message: expect.stringContaining("Invalid"),
      });
    });

    it("rejects wrong password with 401", async () => {
      // Create a user first
      await request(testApp).post("/api/auth/register").send({
        email: "wrongpass@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      const res = await request(testApp)
        .post("/api/auth/login")
        .send({ email: "wrongpass@example.com", password: "wrongpassword" });

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        message: expect.stringContaining("Invalid"),
      });
    });

    it("rejects missing email or password with 400", async () => {
      const res = await request(testApp)
        .post("/api/auth/login")
        .send({ email: "", password: "password" });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        message: expect.stringContaining("required"),
      });
    });

    it("normalizes email case for login", async () => {
      // Create a user first
      await request(testApp).post("/api/auth/register").send({
        email: "casetest@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      const res = await request(testApp)
        .post("/api/auth/login")
        .send({ email: "CASETEST@EXAMPLE.COM", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("casetest@example.com");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("destroys session and returns ok", async () => {
      const agent = request.agent(testApp);

      // Register first
      await agent.post("/api/auth/register").send({
        email: "logout@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      // Logout
      const logoutRes = await agent.post("/api/auth/logout");

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body).toMatchObject({ ok: true });
    });

    it("logs out unauthenticated user without error", async () => {
      const res = await request(testApp).post("/api/auth/logout");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true });
    });
  });

  describe("POST /api/payments", () => {
    const billing = {
      firstName: "Payment",
      streetAddress: "123 Maple Drive",
      townCity: "Townsville",
      phone: "555-0123",
      email: "payment@example.com",
    };

    async function createOrderForAgent(
      agent: ReturnType<typeof request.agent>,
    ) {
      await agent.post("/api/auth/register").send({
        email: `payment-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        password: "password123",
        confirmPassword: "password123",
      });
      await agent.post("/api/cart/items").send({
        productId: "havic-gamepad",
        quantity: 1,
        selectedColor: "#db4444",
        selectedSize: "M",
      });
      const orderRes = await agent.post("/api/orders").send({
        billing,
        paymentMethod: "bank",
      });
      expect(orderRes.status).toBe(201);
      return orderRes.body.order;
    }

    it("requires authentication", async () => {
      const res = await request(testApp)
        .post("/api/payments")
        .send({ orderId: "order-1" });

      expect(res.status).toBe(401);
    });

    it("requires an orderId", async () => {
      const agent = request.agent(testApp);
      await agent.post("/api/auth/register").send({
        email: "missing-order-id@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      const res = await agent.post("/api/payments").send({});

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: "orderId is required" });
    });

    it("marks the authenticated user's order shipped after payment", async () => {
      const agent = request.agent(testApp);
      const order = await createOrderForAgent(agent);

      const res = await agent
        .post("/api/payments")
        .send({ orderId: order.id, paymentMethod: "bank" });

      expect(res.status).toBe(201);
      expect(res.body.payment).toMatchObject({
        status: "succeeded",
        method: "bank",
        provider: "stub",
      });
      expect(res.body.order).toMatchObject({
        id: order.id,
        status: "shipped",
      });
    });

    it("does not allow payment for another user's order", async () => {
      const owner = request.agent(testApp);
      const otherUser = request.agent(testApp);
      const order = await createOrderForAgent(owner);
      await otherUser.post("/api/auth/register").send({
        email: "other-payment-user@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      const res = await otherUser
        .post("/api/payments")
        .send({ orderId: order.id, paymentMethod: "bank" });

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: "Order not found" });
    });
  });

  describe("GET /api/me", () => {
    it("returns current user when authenticated", async () => {
      const agent = request.agent(testApp);

      await agent.post("/api/auth/register").send({
        email: "getme@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      const meRes = await agent.get("/api/me");

      expect(meRes.status).toBe(200);
      expect(meRes.body.user).toMatchObject({
        email: "getme@example.com",
        role: "customer",
      });
    });

    it("returns 401 when not authenticated", async () => {
      const res = await request(testApp).get("/api/me");

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        message: expect.stringContaining("Authentication required"),
      });
    });
  });

  describe("PATCH /api/me", () => {
    it("updates user profile when authenticated", async () => {
      const agent = request.agent(testApp);

      await agent.post("/api/auth/register").send({
        email: "patchme@example.com",
        password: "password123",
        confirmPassword: "password123",
        firstName: "Original",
      });

      const patchRes = await agent
        .patch("/api/me")
        .send({ firstName: "Updated", lastName: "Name" });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.user).toMatchObject({
        firstName: "Updated",
        lastName: "Name",
        email: "patchme@example.com",
      });
    });

    it("returns 401 when not authenticated", async () => {
      const res = await request(testApp)
        .patch("/api/me")
        .send({ firstName: "Updated" });

      expect(res.status).toBe(401);
    });

    it("requires current password for password changes", async () => {
      const agent = request.agent(testApp);

      await agent.post("/api/auth/register").send({
        email: "pwchange@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      const patchRes = await agent.patch("/api/me").send({
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      });

      expect(patchRes.status).toBe(400);
      expect(patchRes.body).toMatchObject({
        message: expect.stringContaining("Current password"),
      });
    });

    it("updates password when current password is correct", async () => {
      const agent = request.agent(testApp);

      await agent.post("/api/auth/register").send({
        email: "pwupdate@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      const patchRes = await agent.patch("/api/me").send({
        currentPassword: "password123",
        newPassword: "newpassword456",
        confirmPassword: "newpassword456",
      });

      expect(patchRes.status).toBe(200);

      // Try to login with old password - should fail
      const oldLoginRes = await request(testApp)
        .post("/api/auth/login")
        .send({ email: "pwupdate@example.com", password: "password123" });
      expect(oldLoginRes.status).toBe(401);

      // Try to login with new password - should succeed
      const newLoginRes = await request(testApp)
        .post("/api/auth/login")
        .send({ email: "pwupdate@example.com", password: "newpassword456" });
      expect(newLoginRes.status).toBe(200);
    });

    it("rejects duplicate email from another user", async () => {
      const agent1 = request.agent(testApp);
      const agent2 = request.agent(testApp);

      await agent1.post("/api/auth/register").send({
        email: "user1duplicate@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      await agent2.post("/api/auth/register").send({
        email: "user2duplicate@example.com",
        password: "password456",
        confirmPassword: "password456",
      });

      const patchRes = await agent2
        .patch("/api/me")
        .send({ email: "user1duplicate@example.com" });

      expect(patchRes.status).toBe(409);
      expect(patchRes.body).toMatchObject({
        message: expect.stringContaining("already registered"),
      });
    });
  });
});
