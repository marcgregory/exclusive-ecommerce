import bcrypt from "bcryptjs";
import type { User } from "./types.js";

export const DEV_SESSION_SECRET = "exclusive-dev-secret";
export const MIN_PASSWORD_LENGTH = 8;

type Body = Record<string, unknown>;
type PublicUpdate = Partial<Pick<User, "firstName" | "lastName" | "email" | "address">> & { passwordHash?: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function httpError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

export function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function optionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidEmail(email: string) {
  return emailPattern.test(email);
}

export function getSessionSecret(env = process.env) {
  const secret = env.SESSION_SECRET || DEV_SESSION_SECRET;
  if (env.NODE_ENV === "production" && (!env.SESSION_SECRET || secret === DEV_SESSION_SECRET || secret.length < 32)) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters in production");
  }
  return secret;
}

export function validateRegisterInput(body: Body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!email || !password) throw httpError("Email and password are required");
  if (!isValidEmail(email)) throw httpError("Enter a valid email address");
  if (password.length < MIN_PASSWORD_LENGTH) throw httpError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  if (password !== confirmPassword) throw httpError("Password confirmation does not match");

  return {
    firstName: optionalText(body.firstName),
    lastName: optionalText(body.lastName),
    email,
    password,
    address: optionalText(body.address)
  };
}

export function validateLoginInput(body: Body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) throw httpError("Email and password are required");
  if (!isValidEmail(email)) throw httpError("Enter a valid email address");

  return { email, password };
}

export async function validateProfileInput(
  body: Body,
  currentUser: User,
  findByEmail: (email: string) => Promise<User | undefined>
): Promise<PublicUpdate> {
  const updates: PublicUpdate = {};
  const textFields = ["firstName", "lastName", "address"] as const;

  textFields.forEach((field) => {
    if (typeof body[field] === "string") updates[field] = body[field].trim();
  });

  if (typeof body.email === "string") {
    const email = normalizeEmail(body.email);
    if (!email) throw httpError("Email is required");
    if (!isValidEmail(email)) throw httpError("Enter a valid email address");
    const duplicate = await findByEmail(email);
    if (duplicate && duplicate.id !== currentUser.id) throw httpError("Email already registered", 409);
    updates.email = email;
  }

  const wantsPasswordChange = Boolean(body.currentPassword || body.newPassword || body.confirmPassword);
  if (wantsPasswordChange) {
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw httpError("Current password, new password, and confirmation are required");
    }
    if (!(await bcrypt.compare(currentPassword, currentUser.passwordHash))) {
      throw httpError("Current password is incorrect", 401);
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw httpError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (newPassword !== confirmPassword) {
      throw httpError("Password confirmation does not match");
    }
    updates.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  return updates;
}
