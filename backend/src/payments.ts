import crypto from 'crypto';
import type { Order } from './types.js';

export type PaymentProvider = 'local' | 'stripe';

export type PaymentResult = {
  id: string;
  status: string;
  method: string;
  provider: PaymentProvider;
  clientSecret?: string | null;
};

type StripePaymentIntent = {
  id: string;
  status: string;
  client_secret?: string | null;
  metadata?: Record<string, string>;
};

type StripeErrorResponse = {
  error?: {
    message?: string;
  };
};

export type StripeWebhookEvent = {
  id?: string;
  type?: string;
  data?: {
    object?: StripePaymentIntent;
  };
};

export function getPaymentProvider(env = process.env): PaymentProvider {
  return env.PAYMENT_PROVIDER === 'stripe' ? 'stripe' : 'local';
}

export function verifyStripeWebhookEvent(
  payload: Buffer,
  signatureHeader: string | undefined,
  env = process.env
): StripeWebhookEvent {
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw Object.assign(new Error('STRIPE_WEBHOOK_SECRET is required'), {
      status: 500,
    });
  }
  if (!signatureHeader) {
    throw Object.assign(new Error('Stripe signature is required'), {
      status: 400,
    });
  }

  const parts = new Map(
    signatureHeader.split(',').map((part) => {
      const [key, value = ''] = part.split('=');
      return [key, value] as const;
    })
  );
  const timestamp = parts.get('t');
  const signature = parts.get('v1');
  if (!timestamp || !signature) {
    throw Object.assign(new Error('Stripe signature is malformed'), {
      status: 400,
    });
  }

  const signedPayload = `${timestamp}.${payload.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    throw Object.assign(new Error('Stripe signature verification failed'), {
      status: 400,
    });
  }

  return JSON.parse(payload.toString('utf8')) as StripeWebhookEvent;
}

export function getStripeAmount(order: Order, env = process.env) {
  const multiplier = Number(env.STRIPE_AMOUNT_MULTIPLIER || 100);
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw Object.assign(new Error('STRIPE_AMOUNT_MULTIPLIER must be a positive number'), {
      status: 500,
    });
  }
  return Math.round(order.total * multiplier);
}

export async function createPayment(
  order: Order,
  userId: string,
  method: string,
  env = process.env
): Promise<PaymentResult> {
  const provider = getPaymentProvider(env);
  if (provider === 'stripe') return createStripePayment(order, userId, method, env);
  return createLocalPayment(method);
}

function createLocalPayment(method: string): PaymentResult {
  return {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'succeeded',
    method,
    provider: 'local',
  };
}

async function createStripePayment(
  order: Order,
  userId: string,
  method: string,
  env: NodeJS.ProcessEnv
): Promise<PaymentResult> {
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw Object.assign(new Error('STRIPE_SECRET_KEY is required'), {
      status: 500,
    });
  }

  const body = new URLSearchParams({
    amount: String(getStripeAmount(order, env)),
    currency: String(env.STRIPE_CURRENCY || 'usd').toLowerCase(),
    'automatic_payment_methods[enabled]': 'true',
    'metadata[orderId]': order.id,
    'metadata[userId]': userId,
    'metadata[paymentMethod]': method,
  });

  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = (await response.json().catch(() => ({}))) as
    | StripePaymentIntent
    | StripeErrorResponse;

  if (!response.ok) {
    const errorData = data as StripeErrorResponse;
    const message =
      typeof errorData.error?.message === 'string'
        ? errorData.error.message
        : 'Stripe payment intent could not be created';
    throw Object.assign(new Error(message), { status: response.status || 502 });
  }

  const intent = data as StripePaymentIntent;
  return {
    id: intent.id,
    status: intent.status,
    method,
    provider: 'stripe',
    clientSecret: intent.client_secret ?? null,
  };
}
