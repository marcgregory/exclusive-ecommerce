# Exclusive Ecommerce

Full-stack ecommerce implementation based on the Figma “Exclusive” design.

## Stack

- React + Vite + TypeScript frontend
- Node/Express + TypeScript API
- PostgreSQL persistence using `pg`
- Source migration in `server/schema.sql`

## Run Locally

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' install
Set-Item Env:DATABASE_URL 'postgres://postgres:postgres@127.0.0.1:5432/exclusive_ecommerce'
& 'C:\nvm4w\nodejs\npm.cmd' run db:migrate
& 'C:\nvm4w\nodejs\npm.cmd' run db:seed
& 'C:\nvm4w\nodejs\npm.cmd' run dev
```

Frontend: `http://127.0.0.1:5173/`

API: `http://127.0.0.1:4000/api/health`

Backend tests require an isolated PostgreSQL database:

```powershell
Set-Item Env:TEST_DATABASE_URL 'postgres://postgres:postgres@127.0.0.1:5432/exclusive_ecommerce_test'
& 'C:\nvm4w\nodejs\npm.cmd' test
```

## Guides

- [Architecture Guide](docs/ARCHITECTURE.md)
- [Frontend Guide](docs/FRONTEND_GUIDE.md)
- [Backend Guide](docs/BACKEND_GUIDE.md)
- [TypeScript Guide](docs/TYPESCRIPT_GUIDE.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)

## Implemented Routes

- `/`
- `/category/:slug`
- `/product/:id`
- `/cart`
- `/checkout`
- `/account`
- `/about`
- `/contact`
- `/wishlist`

## API Coverage

- Auth: register, login, logout, current user, profile update
- Products: list, detail, category/search/filter/sort
- Categories: list
- Cart: get, add, update, remove
- Wishlist: get, add, remove
- Coupons: validate
- Orders: create, list, detail
- Contact: submit message

## Figma Notes

The app follows the extracted design system: 1440px desktop baseline, 1170px centered container, red `#db4444` accent, black footer/top bar, `#f5f5f5` product panels, 4px controls, Poppins body text, and Inter display/logo text.

Figma MCP rate limits prevented extracting every screen at full code depth in one pass, so the remaining pages are implemented from the inspected frame inventory and shared component rules.
