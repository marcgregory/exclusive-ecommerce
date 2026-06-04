# Backend Guide

## Entry Point

The API starts at `server/index.ts`.

Run it with:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' run dev:api
```

## API Groups

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
- `GET /api/orders`
- `GET /api/orders/:id`

### Contact

- `POST /api/contact`

## Data Store

`server/store.ts` exposes PostgreSQL-backed repository functions. `server/db.ts` owns the shared `pg` pool, and `server/types.ts` defines backend domain types.

The app requires `DATABASE_URL` at runtime. `SESSION_SECRET` is optional in development, but production requires a non-default value with at least 32 characters. Session cookies are `httpOnly`, `sameSite: "lax"`, and use `secure: true` when `NODE_ENV=production`.

Initialize development data with:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' run db:migrate
& 'C:\nvm4w\nodejs\npm.cmd' run db:seed
```

Backend tests require `TEST_DATABASE_URL`. The test suite runs migrations and reseeds before repository scenarios.

## Database

Use `server/schema.sql` as the PostgreSQL migration source. It includes users, products, categories, variants, carts, wishlists, coupons, orders, and contact messages.

## Rate Limiting

`server/index.ts` mounts two `express-rate-limit` middlewares (default in-memory store):

- `authLimiter` on `POST /api/auth/register` and `POST /api/auth/login` — 10 requests per 15 minutes per IP.
- `contactLimiter` on `POST /api/contact` — 5 requests per hour per IP.

For production with multiple API instances, swap the in-memory store for a shared backend such as Redis (`rate-limit-redis`) so all instances see the same counters.
