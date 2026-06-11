import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import type { User } from './types.js';
import { DEV_SESSION_SECRET } from './config.js';

export { DEV_SESSION_SECRET };
export const MIN_PASSWORD_LENGTH = 8;

type Body = Record<string, unknown>;
type PublicUpdate = Partial<Pick<User, 'firstName' | 'lastName' | 'email' | 'address'>> & {
  passwordHash?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

type GoogleJwk = crypto.JsonWebKey & {
  alg?: string;
  kid?: string;
  use?: string;
};

type GoogleTokenPayload = {
  aud?: string;
  email?: string;
  email_verified?: boolean | string;
  exp?: number;
  family_name?: string;
  given_name?: string;
  iss?: string;
  name?: string;
  sub?: string;
};

let googleKeysCache: {
  expiresAt: number;
  keys: GoogleJwk[];
} | null = null;

export function httpError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

export function normalizeEmail(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function optionalText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function isValidEmail(email: string) {
  return emailPattern.test(email);
}

function decodeBase64UrlJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
}

async function getGoogleKeys(fetchImpl = globalThis.fetch): Promise<GoogleJwk[]> {
  if (googleKeysCache && googleKeysCache.expiresAt > Date.now()) return googleKeysCache.keys;
  if (!fetchImpl) throw httpError('Google authentication is unavailable', 503);

  const response = await fetchImpl(GOOGLE_CERTS_URL);
  if (!response.ok) throw httpError('Google authentication is unavailable', 503);

  const body = (await response.json()) as { keys?: GoogleJwk[] };
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 300);
  const keys = Array.isArray(body.keys) ? body.keys : [];
  googleKeysCache = {
    expiresAt: Date.now() + Math.max(60, maxAge) * 1000,
    keys,
  };
  return keys;
}

export async function verifyGoogleCredential(
  credential: unknown,
  clientId: string | undefined,
  fetchImpl = globalThis.fetch
): Promise<{
  email: string;
  firstName: string;
  googleSub: string;
  lastName: string;
}> {
  if (!clientId) throw httpError('Google sign-in is not configured', 503);
  const token = String(credential || '');
  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw httpError('Invalid Google credential', 401);
  }

  const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(encodedHeader);
  const payload = decodeBase64UrlJson<GoogleTokenPayload>(encodedPayload);
  if (header.alg !== 'RS256' || !header.kid) throw httpError('Invalid Google credential', 401);

  const key = (await getGoogleKeys(fetchImpl)).find((entry) => entry.kid === header.kid);
  if (!key) throw httpError('Invalid Google credential', 401);

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  const isValidSignature = verifier.verify(
    crypto.createPublicKey({ key, format: 'jwk' }),
    Buffer.from(encodedSignature, 'base64url')
  );
  if (!isValidSignature) throw httpError('Invalid Google credential', 401);

  if (payload.aud !== clientId) throw httpError('Invalid Google credential audience', 401);
  if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
    throw httpError('Invalid Google credential issuer', 401);
  }
  if (!payload.exp || payload.exp * 1000 <= Date.now()) {
    throw httpError('Google credential expired', 401);
  }
  if (payload.email_verified !== true && payload.email_verified !== 'true') {
    throw httpError('Google email is not verified', 401);
  }
  const email = normalizeEmail(payload.email);
  if (!payload.sub || !email || !isValidEmail(email)) {
    throw httpError('Invalid Google profile', 401);
  }

  const fallbackName = String(payload.name || '').trim();
  const [fallbackFirst = '', ...fallbackRest] = fallbackName.split(/\s+/).filter(Boolean);
  return {
    email,
    firstName: String(payload.given_name || fallbackFirst || '').trim(),
    googleSub: payload.sub,
    lastName: String(payload.family_name || fallbackRest.join(' ') || '').trim(),
  };
}

export function getSessionSecret(env = process.env) {
  const secret = env.SESSION_SECRET || DEV_SESSION_SECRET;
  if (
    env.NODE_ENV === 'production' &&
    (!env.SESSION_SECRET || secret === DEV_SESSION_SECRET || secret.length < 32)
  ) {
    throw new Error('SESSION_SECRET must be set to at least 32 characters in production');
  }
  return secret;
}

export function validateRegisterInput(body: Body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  const confirmPassword = String(body.confirmPassword || '');

  if (!email || !password) throw httpError('Email and password are required');
  if (!isValidEmail(email)) throw httpError('Enter a valid email address');
  if (password.length < MIN_PASSWORD_LENGTH)
    throw httpError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  if (password !== confirmPassword) throw httpError('Password confirmation does not match');

  return {
    firstName: optionalText(body.firstName),
    lastName: optionalText(body.lastName),
    email,
    password,
    address: optionalText(body.address),
  };
}

export function validateLoginInput(body: Body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');

  if (!email || !password) throw httpError('Email and password are required');
  if (!isValidEmail(email)) throw httpError('Enter a valid email address');

  return { email, password };
}

export async function validateProfileInput(
  body: Body,
  currentUser: User,
  findByEmail: (email: string) => Promise<User | undefined>
): Promise<PublicUpdate> {
  const updates: PublicUpdate = {};
  const textFields = ['firstName', 'lastName', 'address'] as const;

  textFields.forEach((field) => {
    if (typeof body[field] === 'string') updates[field] = body[field].trim();
  });

  if (typeof body.email === 'string') {
    const email = normalizeEmail(body.email);
    if (!email) throw httpError('Email is required');
    if (!isValidEmail(email)) throw httpError('Enter a valid email address');
    const duplicate = await findByEmail(email);
    if (duplicate && duplicate.id !== currentUser.id)
      throw httpError('Email already registered', 409);
    updates.email = email;
  }

  const wantsPasswordChange = Boolean(
    body.currentPassword || body.newPassword || body.confirmPassword
  );
  if (wantsPasswordChange) {
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    const confirmPassword = String(body.confirmPassword || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw httpError('Current password, new password, and confirmation are required');
    }
    if (!(await bcrypt.compare(currentPassword, currentUser.passwordHash))) {
      throw httpError('Current password is incorrect', 401);
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw httpError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (newPassword !== confirmPassword) {
      throw httpError('Password confirmation does not match');
    }
    updates.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  return updates;
}
