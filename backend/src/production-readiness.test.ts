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
      webOrigins: ["https://shop.example.com"],
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
      webOrigins: ["http://127.0.0.1:5173"],
    });
  });

  it("accepts a comma-separated production CORS allowlist", () => {
    expect(
      loadRuntimeConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://example/prod",
        WEB_ORIGINS:
          "https://shop.example.com, https://exclusive-git-main.vercel.app/",
        SESSION_SECRET: "a".repeat(32),
      } as NodeJS.ProcessEnv),
    ).toMatchObject({
      webOrigins: [
        "https://shop.example.com",
        "https://exclusive-git-main.vercel.app",
      ],
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

  it("returns safe database diagnostics when the ping succeeds", async () => {
    query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
    const { default: app } = await import("./index.js");

    const res = await request(app).get("/api/diagnostics/database");

    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledWith("SELECT 1");
    expect(res.body).toEqual({
      ok: true,
      service: "exclusive-api",
      database: {
        status: "ok",
        responseTimeMs: expect.any(Number),
        checkedAt: expect.any(String),
      },
    });
    expect(JSON.stringify(res.body)).not.toContain("postgres://");
  });

  it("reflects only configured CORS origins", async () => {
    process.env.WEB_ORIGINS =
      "https://shop.example.com,https://preview.example.com";
    const { default: app } = await import("./index.js");

    const allowed = await request(app)
      .get("/api/health")
      .set("Origin", "https://preview.example.com");
    const blocked = await request(app)
      .get("/api/health")
      .set("Origin", "https://attacker.example.com");

    expect(allowed.status).toBe(200);
    expect(allowed.headers["access-control-allow-origin"]).toBe(
      "https://preview.example.com",
    );
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");
    expect(blocked.status).toBe(200);
    expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("returns unavailable diagnostics and logs database failures", async () => {
    query.mockRejectedValue(new Error("database down"));
    const { default: app } = await import("./index.js");

    const res = await request(app).get("/api/diagnostics/database");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      ok: false,
      service: "exclusive-api",
      database: {
        status: "unavailable",
        responseTimeMs: expect.any(Number),
        checkedAt: expect.any(String),
      },
    });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('"event":"database.diagnostic_failed"'),
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('"errorMessage":"database down"'),
    );
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

  it("accepts client error reports and logs a sanitized payload", async () => {
    const { default: app } = await import("./index.js");

    const res = await request(app)
      .post("/api/client-errors")
      .set("x-request-id", "req-client-1")
      .send({
        message: "Browser crashed during checkout",
        name: "TypeError",
        path: "/checkout",
        source: "react.error_boundary",
        userAgent: "Vitest",
        stack: "stack line",
        ignored: "not logged",
      });

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ ok: true, requestId: "req-client-1" });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('"event":"client.error"'),
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('"requestId":"req-client-1"'),
    );
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining("not logged"),
    );
  });
});
