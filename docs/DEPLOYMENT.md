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

- `PAYMENT_PROVIDER=local` or `stripe`; defaults to `local`.
- `STRIPE_SECRET_KEY`: required when `PAYMENT_PROVIDER=stripe`.
- `STRIPE_WEBHOOK_SECRET`: required for Stripe webhook verification.
- `STRIPE_CURRENCY`: defaults to `usd`.
- `STRIPE_AMOUNT_MULTIPLIER`: defaults to `100`.

## Frontend: Vercel

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Required environment variables:

- `VITE_API_BASE`: deployed Render API origin, for example `https://exclusive-api.onrender.com`.

Optional payment environment:

- `VITE_STRIPE_PUBLISHABLE_KEY`: required by browser checkout when the backend uses Stripe.

## PostgreSQL

Run the backend migration before serving production traffic:

```powershell
cd backend
$env:DATABASE_URL="postgres://..."
npm run db:migrate
```

Use `/api/health` for process liveness. Use `/api/ready` when the caller needs proof that the API can reach PostgreSQL.
