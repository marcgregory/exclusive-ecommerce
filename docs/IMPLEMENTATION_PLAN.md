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

## Phase 3: Backend Persistence - Complete

- Replace JSON store with PostgreSQL repositories.
- Keep the current API response shapes stable.
- Add database migration scripts.
- Add seed scripts for categories, products, coupons, and demo user data.
- Add environment-based database config:
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `WEB_ORIGIN`
- Keep the JSON store only as an optional development fallback if useful.

## Phase 4: Authentication And Sessions - In Progress

- Harden auth validation for register, login, profile update, and password changes.
- Add password confirmation and current-password checks for password updates.
- Configure secure cookies for production:
  - `httpOnly: true`
  - `sameSite: "lax"` or stricter if deployment allows
  - `secure: true` in production
- Add logout behavior in the frontend header/account area.
- Add unauthenticated states for cart, wishlist, checkout, and account.

## Phase 5: Ecommerce Workflows

- Completed:
  - Order confirmation page after checkout.
  - Order history UI in the account page.
  - Product option validation for size and color on the product details page.
  - Variant stock checks during add-to-cart, cart quantity updates, and checkout.
- Remaining:
  - Finish product filtering and sorting UI:
    - Category
    - Search
    - Sale items
    - Best selling
    - Price ascending/descending
    - Rating
  - Add wishlist page remove/move-to-cart behavior.
  - Add end-to-end checkout coverage across cart, checkout, payment, confirmation, and order history.
  - Integrate the selected payment provider beyond the current local payment simulation.

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
  - Completed:
    - Product card interactions
    - Product details loading/error/rendering, option validation, cart, and wishlist actions
    - Cart quantity changes
    - Checkout guest/error/empty/submission/payment failure paths
    - Stock-limit failures during cart quantity updates and checkout
    - Account guest/profile/order-history loading/error/rendering/detail navigation
    - Order detail guest/loading/error/not-found/rendering/payment-status paths
  - Remaining:
    - Account profile update submission
    - Contact form submission
    - E2E checkout flow with order confirmation and history verification
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

1. Finish authentication and session hardening, including logout coverage.
2. Add wishlist remove and move-to-cart behavior.
3. Add E2E checkout coverage from cart through order history.
4. Select and integrate the real Stripe/payment provider path.
5. Extract another round of Figma MCP screenshots for cart, checkout, account, and contact, then run visual QA.
