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

`server/store.ts` manages local JSON persistence. `server/seed.ts` provides initial data. `server/types.ts` defines backend domain types.

When replacing JSON storage with PostgreSQL, keep the API response shapes stable and move the implementation behind functions with the same responsibilities as:

- `findProduct`
- `getUserCart`
- `getWishlist`
- `toCartResponse`

## Database

Use `server/schema.sql` as the initial PostgreSQL schema. It includes users, products, categories, variants, carts, wishlists, coupons, orders, and contact messages.

