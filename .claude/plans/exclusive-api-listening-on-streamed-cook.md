# Fix "Please choose a color" cart errors and PATCH /api/me bug

## Context

The API log shows two failures originating from the same product-detail flow:

1. `Error: Please choose a color for AK-900 Wired Keyboard` and the same for `S-Series Comfort Chair`, thrown by `addCartItem` in `backend/src/store.ts:347` (called from `backend/src/index.ts:264`, the `POST /api/cart/items` handler).
2. The user also reports a `/me` issue. Investigation shows the GET `/api/me` path and the `PublicUser` shape are correct, but the `PATCH /api/me` profile-save flow in `AccountPage` always submits the password fields (even when blank), which makes the backend's `validateProfileInput` treat it as a password-change attempt and 400 with "Current password, new password, and confirmation are required".

Root cause for #1: two frontend surfaces POST `/api/cart/items` with `selectedColor: ""`/`selectedSize: ""` even when the product requires a choice — the `Add To Cart` button on `ProductCard` and the quick-add in `WishlistPage`. The proper flow on `ProductDetailsPage` already works (it sends the picked color/size as the raw hex/string), so the backend validation is correct and should not be relaxed.

Goal: make "Add To Cart" from a card or wishlist row always succeed (when the user is signed in) by routing to the product page where variants can be picked, and fix the profile-save PATCH so it doesn't 400 on an unchanged-password save.

## Changes

### 1. ProductCard — "Add To Cart" routes to the details page

File: `frontend/src/components/ProductCard.tsx`

- The card receives `onAdd` from `App` (`frontend/src/main.tsx:115`). It currently calls `onAdd(product.id)` with no color/size, which posts an invalid body.
- Change the `add-cart` button onClick to `navigate(\`/product/${product.id}\`)` (or call the existing `onAdd` only if the product has no colors AND no sizes — but per the chosen approach, the simplest correct fix is to always navigate). The card already has a clickable area that navigates to the product page; align the explicit button with the same behaviour.
- Pass a `navigate` prop from `App` (or expose it through the existing pattern) so the card can navigate. `App` already has `navigate` from `useRoute()` (`main.tsx:28`).
- The card's existing heart/wishlist icon button (`onWishlist`) and the `View product` link stay as-is; only the `add-cart` button changes.

### 2. WishlistPage — "Add To Cart" routes to the details page

File: `frontend/src/pages/WishlistPage.tsx`

- Line 61 currently does an `api("/api/cart/items", ...)` with hard-coded `selectedColor: ""`/`selectedSize: ""`. Replace with `navigate(\`/product/${productId}\`)`.
- The page already receives `navigate` as a prop (used elsewhere in the file) — no new wiring needed.

### 3. PATCH /api/me — strip empty password fields

File: `frontend/src/pages/AccountPage.tsx`, `submitProfile` (line 76)

- After building `payload` from the form, delete the three password keys (`currentPassword`, `newPassword`, `confirmPassword`) when they are empty strings. The backend's `validateProfileInput` (`backend/src/auth.ts:65`) treats the presence of any of these as a password-change attempt, so omitting them (rather than sending `""`) is the right fix.
- The form already clears the password inputs after submit (line 88), so empty fields after a successful save are normal — this is purely a payload-shape fix, not a UX change.
- No backend change.

## Files modified

- `frontend/src/components/ProductCard.tsx` — change `add-cart` onClick to navigate to the product page; receive `navigate` prop.
- `frontend/src/pages/WishlistPage.tsx` — replace the invalid `api("/api/cart/items", ...)` call with `navigate(\`/product/${id}\`)`.
- `frontend/src/pages/AccountPage.tsx` — in `submitProfile`, strip empty `currentPassword`/`newPassword`/`confirmPassword` from the PATCH payload.
- `frontend/src/main.tsx` — pass `navigate` to `ProductCard` (one-line change in the page-routing block around line 198–202 where `ProductCard` is rendered for each product).

## Files NOT modified

- `backend/src/store.ts` `addCartItem` — the color/size validation is correct; the bug is purely client-side.
- `backend/src/index.ts` — already routes the cart POST and `/me` correctly.
- `backend/src/auth.ts` `validateProfileInput` — already correct; the fix is in the payload the client sends.

## Verification

1. Sign in (`/account`), then from the home grid click "Add To Cart" on a coloured product (e.g. AK-900 Wired Keyboard). Expect: navigates to `/product/{id}`; no 400 in the terminal.
2. On the product page, pick a color (and size, if required) and click the in-page "Add To Cart" / "Buy Now". Expect: cart count in the header increments; no error.
3. Add an item from a wishlist row. Expect: navigates to the product page; no 400.
4. Save the profile form on `/account` with the password fields blank. Expect: "Profile saved." status, no 400, no "Current password …" error.
5. With the dev server running, confirm the terminal no longer shows `Error: Please choose a color for …`.
6. Run the existing test suite — `cd backend && npm test` and `cd frontend && npm test` — to confirm no regressions. The AccountPage test (`frontend/src/pages/AccountPage.test.tsx`) already covers a successful PATCH; verify it still passes after the strip-empty-passwords change.
