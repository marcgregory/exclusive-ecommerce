# Deployment Guide

## Backend: Render

- Root directory: `backend`
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check path: `/api/health`
- Readiness check path: `/api/ready`

Required environment variables:

- `NODE_ENV=production`
- `DATABASE_URL`: managed PostgreSQL connection string.
- `SESSION_SECRET`: random secret with at least 32 characters.
- `WEB_ORIGIN`: deployed Vercel origin, for example `https://exclusive.example.com`.

`NODE_ENV=production` stores Express sessions in PostgreSQL using the same `DATABASE_URL`. Run migrations before serving traffic so the `app_sessions` table exists.

Optional payment environment:

- `PAYMENT_PROVIDER=local` or `stripe`; defaults to `local`. Use `stripe` in production checkout.
- `STRIPE_SECRET_KEY`: required when `PAYMENT_PROVIDER=stripe`.
- `STRIPE_WEBHOOK_SECRET`: required for Stripe webhook verification. Copy this from the Stripe webhook endpoint signing secret.
- `STRIPE_CURRENCY`: defaults to `usd`.
- `STRIPE_AMOUNT_MULTIPLIER`: defaults to `100`.

## Frontend: Vercel

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Required environment variables:

- `VITE_API_BASE`: deployed Render API origin, for example `https://exclusive-api.onrender.com`.

Optional monitoring environment:

- `VITE_ENABLE_CLIENT_ERROR_REPORTING=true`: sends browser render, global error, and unhandled promise rejection reports to `POST /api/client-errors`.

Optional payment environment:

- `VITE_STRIPE_PUBLISHABLE_KEY`: required by browser checkout when the backend uses Stripe.

## PostgreSQL

Run the backend migration before serving production traffic:

```powershell
cd backend
$env:DATABASE_URL="postgres://..."
npm run db:migrate
```

Use `/api/health` for process liveness. Use `/api/ready` when the caller needs proof that the API can reach PostgreSQL. Use `/api/diagnostics/database` for a production-safe database diagnostic that includes only availability, response time, and timestamp.

## Stripe Webhook Setup

- In Stripe Dashboard, create a webhook endpoint pointed at the deployed backend URL: `https://<render-api-origin>/api/webhooks/stripe`.
- Subscribe to these PaymentIntent events:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`
- Set `STRIPE_WEBHOOK_SECRET` on Render to the endpoint signing secret that starts with `whsec_`.
- Keep `VITE_STRIPE_PUBLISHABLE_KEY` on Vercel paired with the same Stripe mode as `STRIPE_SECRET_KEY` on Render. Do not mix test publishable keys with live secret keys.
- Run `npm run db:migrate` after deploying the backend change so the `stripe_webhook_events` ledger exists before Stripe sends events.

## Monitoring Setup

Render:

- Configure the service health check path as `/api/health` so Render restarts only on process liveness failures.
- Add an external uptime check for `/api/ready` from your monitoring provider to alert when the API cannot reach PostgreSQL.
- Add a lower-frequency external check for `/api/diagnostics/database` to track database response time without exposing connection details.
- Review Render logs for structured events: `api.request`, `api.error`, `client.error`, and `database.diagnostic_failed`.

Vercel:

- Enable deployment/build notifications for failed frontend deploys.
- Set `VITE_ENABLE_CLIENT_ERROR_REPORTING=true` for production so browser errors are forwarded to the API logs.
- Add an external check for the deployed frontend origin, usually `/`, and alert on non-2xx responses or unexpected latency.

Expected healthy checks:

- Frontend `/`: 2xx from Vercel.
- API `/api/health`: 200 with `{ "ok": true, "service": "exclusive-api" }`.
- API `/api/ready`: 200 with database status `ok`.
- API `/api/diagnostics/database`: 200 with database status `ok` and `responseTimeMs`.
