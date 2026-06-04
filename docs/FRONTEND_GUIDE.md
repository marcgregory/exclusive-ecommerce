# Frontend Guide

## Entry Point

The React app starts at `frontend/src/main.tsx`. It currently uses a lightweight client-side router based on `window.history`.

## Routes

- `/`
- `/category/:slug`
- `/product/:id`
- `/cart`
- `/checkout`
- `/account`
- `/about`
- `/contact`
- `/wishlist`

## Component Conventions

Keep reusable UI in small components before adding page-specific markup. Important existing components include:

- `TopHeader`
- `Header`
- `Footer`
- `Breadcrumbs`
- `Button`
- `SectionHeader`
- `ProductCard`
- `CategoryTile`
- `QuantityStepper`
- `ServiceBadges`

## Styling

Styles live in `frontend/src/styles.css`. Prefer extending the existing design tokens at the top of the file:

```css
:root {
  --accent: #db4444;
  --soft: #f5f5f5;
  --container: 1170px;
}
```

Use the existing layout classes before creating new ones. Keep desktop layout close to the Figma baseline, then add mobile behavior under the existing media queries.

## API Calls

Use the `api<T>()` helper in `frontend/src/api/client.ts` for browser-to-server calls. It automatically includes JSON headers and cookies.

```ts
const data = await api<{ products: Product[] }>("/api/products");
```

## TypeScript

Frontend domain types live in `frontend/src/types/index.ts` and are imported by pages/components.
