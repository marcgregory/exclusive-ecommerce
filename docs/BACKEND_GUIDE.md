# Backend Guide

## Entry Point

The API starts at `backend/src/index.ts`.

Run it with:

```powershell
cd backend
& 'C:\nvm4w\nodejs\npm.cmd' run dev
```

## API Groups

### Operations

- `GET /api/health`: liveness only; does not touch PostgreSQL.
- `GET /api/ready`: readiness check; returns database connectivity status.
- `GET /api/diagnostics/database`: production-safe database diagnostic with status, response time, and check timestamp. It does not expose connection strings, database names, users, SQL text beyond the ping, or schema details.
- `POST /api/client-errors`: accepts frontend error reports and writes them to structured backend logs.

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `PATCH /api/me`

### Products and Categories

- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/categories`

Product listing supports `category`, `q`, `flag`, `sort`, `page`, and `limit`.

### Cart

- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:id`
- `DELETE /api/cart/items/:id`

### Wishlist

- `GET /api/wishlist`
- `POST /api/wishlist/:productId`
- `DELETE /api/wishlist/:productId`

### Checkout and Orders

- `POST /api/coupons/validate`
- `POST /api/orders`
- `POST /api/payments`
- `GET /api/orders`
- `GET /api/orders/:id`

`POST /api/payments` uses `PAYMENT_PROVIDER=local` by default, which simulates a successful payment and marks the order shipped. Set `PAYMENT_PROVIDER=stripe` with `STRIPE_SECRET_KEY` to create a Stripe PaymentIntent. Stripe mode returns the PaymentIntent `clientSecret`; the browser confirms it with Stripe.js/Elements, and `/api/webhooks/stripe` reconciles final success, failure, and cancellation events back to the order.

### Stripe Webhook

- `POST /api/webhooks/stripe`

The webhook endpoint must receive the raw Stripe JSON payload and a valid `stripe-signature` header. It verifies the payload with `STRIPE_WEBHOOK_SECRET`, records the Stripe event ID in `stripe_webhook_events`, skips duplicate events, and applies guarded order transitions:

- `payment_intent.succeeded`: marks `processing` or `cancelled` orders as `shipped`.
- `payment_intent.payment_failed` and `payment_intent.canceled`: mark only `processing` orders as `cancelled`.
- Later failure/cancel events do not downgrade `shipped` or `delivered` orders.

### Contact

- `POST /api/contact`

## Data Store

`backend/src/store.ts` exposes PostgreSQL-backed repository functions. `backend/src/db.ts` owns the shared `pg` pool, and `backend/src/types.ts` defines backend domain types.

The app validates runtime configuration on startup. `DATABASE_URL` is always required. `WEB_ORIGIN` is required when `NODE_ENV=production` and is used as the credentialed CORS origin. Set `WEB_ORIGINS` to a comma-separated allowlist when production needs more than one frontend origin, such as a canonical Vercel domain and preview/deployment URLs. `SESSION_SECRET` is optional in development, but production requires a non-default value with at least 32 characters. Production sets Express `trust proxy` so secure session cookies work behind Render. Session cookies are `httpOnly`, `sameSite: "lax"`, and use `secure: true` when `NODE_ENV=production`.

Production sessions use the PostgreSQL-backed `app_sessions` table through the existing `DATABASE_URL`; development and test keep the default in-process session store. Run `npm run db:migrate` before production traffic so the `app_sessions` table and expiration index exist.

Payment configuration:

- `PAYMENT_PROVIDER`: `local` or `stripe`; defaults to `local`.
- `STRIPE_SECRET_KEY`: required when `PAYMENT_PROVIDER=stripe`.
- `STRIPE_WEBHOOK_SECRET`: required for `/api/webhooks/stripe` signature verification.
- `STRIPE_CURRENCY`: Stripe currency code; defaults to `usd`.
- `STRIPE_AMOUNT_MULTIPLIER`: multiplier from app totals to Stripe smallest currency units; defaults to `100`.

Initialize development data with:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' run db:migrate
& 'C:\nvm4w\nodejs\npm.cmd' run db:seed
```

Backend tests require `TEST_DATABASE_URL`. The test suite runs migrations and reseeds before repository scenarios.

## Database

Use `backend/src/schema.sql` as the PostgreSQL migration source. It includes users, products, categories, variants, carts, wishlists, coupons, orders, contact messages, and the production `app_sessions` table.

## Rate Limiting

`backend/src/index.ts` mounts three `express-rate-limit` middlewares (default in-memory store):

- `authLimiter` on `POST /api/auth/register` and `POST /api/auth/login`: 10 requests per 15 minutes per IP.
- `contactLimiter` on `POST /api/contact`: 5 requests per hour per IP.
- `adminWriteLimiter` on admin write endpoints: 30 requests per minute per IP.
- `clientErrorLimiter` on `POST /api/client-errors`: 20 reports per minute per IP.

Rate limiting is bypassed under `NODE_ENV=test` unless `DISABLE_RATE_LIMIT_BYPASS=true` is set for tests that intentionally verify 429 behavior.

For production with multiple API instances, swap the in-memory store for a shared backend such as Redis (`rate-limit-redis`) so all instances see the same counters.

## Logging and Monitoring

Every API response includes an `x-request-id` header. If the caller sends `x-request-id`, the API preserves it; otherwise the API generates one. JSON response bodies for handled API errors include `requestId` alongside the existing `message` field.

The backend writes structured JSON logs with `level`, `event`, and `timestamp`. Important event names:

- `api.request`: method, path, status, duration, and request ID for each response.
- `api.error`: backend exception details tied to the request ID.
- `database.diagnostic_failed`: database diagnostic failures without exposing connection secrets.
- `client.error`: browser error reports posted by the frontend.
