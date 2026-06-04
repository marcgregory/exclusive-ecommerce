# Implementation Plan

## Current Baseline

The project already has a working TypeScript full-stack foundation:

- React/Vite storefront in `src/main.tsx`
- Express API in `server/index.ts`
- Typed backend domain models in `server/types.ts`
- Local JSON-backed development store in `server/store.ts`
- PostgreSQL schema in `server/schema.sql`
- Core ecommerce routes, cart, wishlist, checkout, account, contact, and seeded products

The next work should focus on turning this from a prototype into a production-ready ecommerce application.

## Phase 1: Stabilize The TypeScript App

- Split `src/main.tsx` into feature folders:
  - `src/components/`
  - `src/pages/`
  - `src/api/`
  - `src/types/`
  - `src/lib/`
- Move shared frontend domain types out of `main.tsx` into `src/types/index.ts`.
- Move the `api<T>()` helper into `src/api/client.ts`.
- Keep `main.tsx` responsible only for app bootstrap and top-level routing.
- Add route-level loading and error states for product, cart, wishlist, account, checkout, and contact pages.

## Phase 2: Improve Frontend Fidelity

- Reconnect to Figma MCP when rate limits allow and extract each major frame individually.
- Replace placeholder CSS product illustrations with real extracted or generated assets.
- Compare desktop views against Figma screenshots at 1440px.
- Tune spacing, typography, and component dimensions for:
  - Header
  - Footer
  - Product cards
  - Product details
  - Cart
  - Checkout
  - Account
  - Contact
- Add responsive QA for mobile and tablet breakpoints.

## Phase 3: Backend Persistence

- Replace JSON store with PostgreSQL repositories.
- Keep the current API response shapes stable.
- Add database migration scripts.
- Add seed scripts for categories, products, coupons, and demo user data.
- Add environment-based database config:
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `WEB_ORIGIN`
- Keep the JSON store only as an optional development fallback if useful.

## Phase 4: Authentication And Sessions

- Harden auth validation for register, login, profile update, and password changes.
- Add password confirmation and current-password checks for password updates.
- Configure secure cookies for production:
  - `httpOnly: true`
  - `sameSite: "lax"` or stricter if deployment allows
  - `secure: true` in production
- Add logout behavior in the frontend header/account area.
- Add unauthenticated states for cart, wishlist, checkout, and account.

## Phase 5: Ecommerce Workflows

- Finish product filtering and sorting UI:
  - Category
  - Search
  - Sale items
  - Best selling
  - Price ascending/descending
  - Rating
- Add product option validation for size and color.
- Add stock checks during add-to-cart and checkout.
- Add order confirmation page after checkout.
- Add order history UI in the account page.
- Add wishlist page remove/move-to-cart behavior.

## Phase 6: Admin Readiness

- Add backend endpoints for admin product/category management.
- Add role field to users.
- Protect admin routes with role-based authorization.
- Add admin CRUD for:
  - Products
  - Categories
  - Product images
  - Product variants
  - Coupons
  - Orders
- Admin UI can be added after storefront parity is stable.

## Phase 7: Testing

- Backend tests:
  - Auth register/login/logout
  - Product filters
  - Cart add/update/remove
  - Coupon validation
  - Order creation
  - Contact submission
- Frontend tests:
  - Product card interactions
  - Cart quantity changes
  - Checkout validation
  - Account form updates
  - Contact form submission
- Visual QA:
  - Desktop 1440px screenshots against Figma
  - Mobile no-overlap checks
  - Header/footer consistency across routes

## Phase 8: Production Readiness

- Add deployment configuration.
- Add production environment documentation.
- Add logging and request error handling.
- Add API rate limiting for auth and contact endpoints.
- Add image hosting strategy.
- Add payment provider integration when selected.
- Add monitoring checks for frontend, API, and database.

## Recommended Next Sprint

1. Split `src/main.tsx` into components, pages, API, and types.
2. Move backend persistence behind repository functions.
3. Add PostgreSQL connection and migration scripts.
4. Add order confirmation and order history UI.
5. Extract another round of Figma MCP screenshots for cart, checkout, account, and contact.

