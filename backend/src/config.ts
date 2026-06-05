export type PaymentProvider = "local" | "stripe";

export type RuntimeConfig = {
  databaseUrl: string;
  isProduction: boolean;
  nodeEnv: string;
  paymentProvider: PaymentProvider;
  port: number;
  sessionSecret: string;
  stripeSecretKey?: string;
  webOrigins: string[];
};

export const DEV_SESSION_SECRET = "exclusive-dev-secret";
export const DEFAULT_WEB_ORIGIN = "http://127.0.0.1:5173";

function requireValue(env: NodeJS.ProcessEnv, name: string) {
  const value = env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function normalizeWebOrigin(origin: string) {
  try {
    return new URL(origin.trim()).origin;
  } catch {
    throw new Error(`Invalid WEB_ORIGIN value: ${origin}`);
  }
}

function parseWebOrigins(value: string) {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeWebOrigin);

  return [...new Set(origins)];
}

export function loadRuntimeConfig(env = process.env): RuntimeConfig {
  const nodeEnv = env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const databaseUrl = requireValue(env, "DATABASE_URL");
  const webOriginValue = isProduction
    ? env.WEB_ORIGINS || requireValue(env, "WEB_ORIGIN")
    : env.WEB_ORIGINS || env.WEB_ORIGIN || DEFAULT_WEB_ORIGIN;
  const webOrigins = parseWebOrigins(webOriginValue);
  const sessionSecret = env.SESSION_SECRET || DEV_SESSION_SECRET;
  const paymentProvider: PaymentProvider =
    env.PAYMENT_PROVIDER === "stripe" ? "stripe" : "local";

  if (
    isProduction &&
    (!env.SESSION_SECRET ||
      sessionSecret === DEV_SESSION_SECRET ||
      sessionSecret.length < 32)
  ) {
    throw new Error(
      "SESSION_SECRET must be set to at least 32 characters in production",
    );
  }

  if (paymentProvider === "stripe" && !env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe");
  }

  return {
    databaseUrl,
    isProduction,
    nodeEnv,
    paymentProvider,
    port: Number(env.PORT || 4000),
    sessionSecret,
    stripeSecretKey: env.STRIPE_SECRET_KEY,
    webOrigins,
  };
}
