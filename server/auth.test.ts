import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import {
  DEV_SESSION_SECRET,
  getSessionSecret,
  normalizeEmail,
  validateLoginInput,
  validateProfileInput,
  validateRegisterInput
} from "./auth.js";
import type { User } from "./types.js";

const user = async (overrides: Partial<User> = {}): Promise<User> => ({
  id: "user-1",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  address: "London",
  passwordHash: await bcrypt.hash("oldpassword", 10),
  ...overrides
});

describe("auth validation", () => {
  it("normalizes email input", () => {
    expect(normalizeEmail(" ADA@Example.COM ")).toBe("ada@example.com");
  });

  it("validates registration email, password length, and confirmation", () => {
    expect(() => validateRegisterInput({ email: "bad", password: "password1", confirmPassword: "password1" })).toThrow("valid email");
    expect(() => validateRegisterInput({ email: "ada@example.com", password: "short", confirmPassword: "short" })).toThrow("at least 8");
    expect(() => validateRegisterInput({ email: "ada@example.com", password: "password1", confirmPassword: "password2" })).toThrow("does not match");

    expect(validateRegisterInput({ email: " ADA@Example.COM ", password: "password1", confirmPassword: "password1" })).toMatchObject({
      email: "ada@example.com"
    });
  });

  it("validates login email shape and required password", () => {
    expect(() => validateLoginInput({ email: "ada@example.com", password: "" })).toThrow("required");
    expect(() => validateLoginInput({ email: "bad", password: "password1" })).toThrow("valid email");
    expect(validateLoginInput({ email: " ADA@Example.COM ", password: "password1" })).toEqual({
      email: "ada@example.com",
      password: "password1"
    });
  });

  it("rejects duplicate profile emails owned by another user", async () => {
    const current = await user();

    await expect(
      validateProfileInput({ email: "grace@example.com" }, current, async () => ({ ...(await user()), id: "user-2", email: "grace@example.com" }))
    ).rejects.toThrow("Email already registered");
  });

  it("preserves unspecified profile fields and validates password changes", async () => {
    const current = await user();

    await expect(validateProfileInput({ newPassword: "newpassword", confirmPassword: "newpassword" }, current, async () => undefined)).rejects.toThrow(
      "Current password"
    );
    await expect(
      validateProfileInput({ currentPassword: "wrongpass", newPassword: "newpassword", confirmPassword: "newpassword" }, current, async () => undefined)
    ).rejects.toThrow("incorrect");
    await expect(
      validateProfileInput({ currentPassword: "oldpassword", newPassword: "newpass1", confirmPassword: "newpass2" }, current, async () => undefined)
    ).rejects.toThrow("does not match");

    const updates = await validateProfileInput({ address: "New address" }, current, async () => undefined);
    expect(updates).toEqual({ address: "New address" });
  });

  it("requires stronger session secrets in production", () => {
    expect(getSessionSecret({ NODE_ENV: "development" } as NodeJS.ProcessEnv)).toBe(DEV_SESSION_SECRET);
    expect(() => getSessionSecret({ NODE_ENV: "production", SESSION_SECRET: "short" } as NodeJS.ProcessEnv)).toThrow("SESSION_SECRET");
    expect(getSessionSecret({ NODE_ENV: "production", SESSION_SECRET: "a".repeat(32) } as NodeJS.ProcessEnv)).toBe("a".repeat(32));
  });
});
