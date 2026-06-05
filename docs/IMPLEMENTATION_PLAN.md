# Implementation Plan

## Current Baseline

The project already has a working TypeScript full-stack foundation:

- React/Vite storefront in `frontend/src/main.tsx`
- Express API in `backend/src/index.ts`
- Typed backend domain models in `backend/src/types.ts`
- PostgreSQL-backed store in `backend/src/store.ts`
- PostgreSQL schema in `backend/src/schema.sql`
- Core ecommerce routes, cart, wishlist, checkout, account, contact, and seeded products

The next work should focus on turning this from a prototype into a production-ready ecommerce application.

## Phase 1: Stabilize The TypeScript App

- Frontend feature folders live under `frontend/src/`:
  - `frontend/src/components/`
  - `frontend/src/pages/`
  - `frontend/src/api/`
  - `frontend/src/types/`
  - `frontend/src/lib/`
- Shared frontend domain types live in `frontend/src/types/index.ts`.
- The `api<T>()` helper lives in `frontend/src/api/client.ts`.
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
  - Product discovery, filtering, search, sorting, and pagination for category and search routes.
  - Product option validation for size and color on the product details page.
  - Variant stock checks during add-to-cart, cart quantity updates, and checkout.
  - Wishlist page remove and move-to-cart behavior.
  - End-to-end checkout coverage across cart, checkout, payment, confirmation, and order history.
  - Stripe server-side PaymentIntent creation behind `PAYMENT_PROVIDER=stripe`, with local simulation kept for development and tests.
- Remaining:
  - Finish the last Stripe production pieces:
    - Client-side Stripe confirmation with Stripe.js/Elements.
    - Webhook-based order status reconciliation.

## Phase 6: Admin Readiness - Active

- Completed:
  - Add backend endpoints for admin product/category management.
  - Add role field to users.
  - Protect admin routes with role-based authorization.
  - Add admin order review/detail UI.
- Current sprint:
  - Add admin product CRUD UI.
  - Add admin category CRUD UI.
  - Keep image management scoped to editing the existing product image key string.
- Later admin follow-up:
  - Product image upload/hosting workflows.
  - Product variant management UI.
  - Coupon management UI.

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
    - Wishlist guest/loading/error/empty/rendering, remove, move-to-cart, and action-error paths
    - E2E checkout flow with order confirmation and history verification
  - Remaining:
    - Account profile update submission
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
- Finish payment provider integration with client-side confirmation and webhooks.
- Add monitoring checks for frontend, API, and database.

## Recommended Next Sprint

1. Finish and verify the admin product/category CRUD UI.
2. Add auth/contact rate limiting and production deployment documentation/config.
3. Add monitoring/logging for frontend, API, and database.
4. Finish Stripe client confirmation and webhook reconciliation.
5. Extract another round of Figma MCP screenshots for cart, checkout, account, and contact, then run visual QA.
