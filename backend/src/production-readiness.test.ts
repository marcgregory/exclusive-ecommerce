import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadRuntimeConfig } from "./config.js";
import {
  createSessionOptions,
  PostgreSqlSessionStore,
} from "./session-store.js";

describe("runtime config", () => {
  it("rejects unsafe production configuration", () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://example/prod",
        WEB_ORIGIN: "https://shop.example.com",
        SESSION_SECRET: "short",
      } as NodeJS.ProcessEnv),
    ).toThrow("SESSION_SECRET");

    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://example/prod",
        SESSION_SECRET: "a".repeat(32),
      } as NodeJS.ProcessEnv),
    ).toThrow("WEB_ORIGIN");

    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://example/prod",
        WEB_ORIGIN: "https://shop.example.com",
        SESSION_SECRET: "a".repeat(32),
        PAYMENT_PROVIDER: "stripe",
      } as NodeJS.ProcessEnv),
    ).toThrow("STRIPE_SECRET_KEY");
  });

  it("accepts valid production env and development defaults", () => {
    expect(
      loadRuntimeConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://example/prod",
        WEB_ORIGIN: "https://shop.example.com",
        SESSION_SECRET: "a".repeat(32),
      } as NodeJS.ProcessEnv),
    ).toMatchObject({
      databaseUrl: "postgres://example/prod",
      isProduction: true,
      webOrigin: "https://shop.example.com",
    });

    expect(
      loadRuntimeConfig({
        NODE_ENV: "development",
        DATABASE_URL: "postgres://example/dev",
      } as NodeJS.ProcessEnv),
    ).toMatchObject({
      isProduction: false,
      paymentProvider: "local",
      port: 4000,
      webOrigin: "http://127.0.0.1:5173",
    });
  });
});

describe("session config", () => {
  it("uses PostgreSQL session storage only in production", () => {
    const productionConfig = loadRuntimeConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://example/prod",
      WEB_ORIGIN: "https://shop.example.com",
      SESSION_SECRET: "a".repeat(32),
    } as NodeJS.ProcessEnv);

    const testConfig = loadRuntimeConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgres://example/test",
      SESSION_SECRET: "test-session-secret-with-at-least-32-chars",
    } as NodeJS.ProcessEnv);

    expect(createSessionOptions(productionConfig).store).toBeInstanceOf(
      PostgreSqlSessionStore,
    );
    expect(createSessionOptions(testConfig).store).toBeUndefined();
  });
});

describe("health, readiness, and error metadata", () => {
  const query = vi.fn();
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      DATABASE_URL: "postgres://example/test",
      SESSION_SECRET: "test-session-secret-with-at-least-32-chars",
    };
    query.mockReset();
    vi.doMock("./db.js", () => ({
      closePool: vi.fn(),
      query,
    }));
  });

  afterEach(() => {
    vi.doUnmock("./db.js");
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it("keeps liveness independent from database access", async () => {
    const { default: app } = await import("./index.js");

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, service: "exclusive-api" });
    expect(query).not.toHaveBeenCalled();
  });

  it("returns ready when the database ping succeeds", async () => {
    query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
    const { default: app } = await import("./index.js");

    const res = await request(app).get("/api/ready");

    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledWith("SELECT 1");
    expect(res.body).toEqual({
      ok: true,
      service: "exclusive-api",
      database: "ok",
    });
  });

  it("returns unavailable when the database ping fails", async () => {
    query.mockRejectedValue(new Error("database down"));
    const { default: app } = await import("./index.js");

    const res = await request(app).get("/api/ready");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      ok: false,
      service: "exclusive-api",
      database: "unavailable",
    });
  });

  it("adds requestId to client error responses", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";
    const { default: app } = await import("./index.js");

    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("x-request-id", "req-test-1")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.succeeded" }));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      message: "Stripe signature is required",
      requestId: "req-test-1",
    });
    expect(res.headers["x-request-id"]).toBe("req-test-1");
  });
});
