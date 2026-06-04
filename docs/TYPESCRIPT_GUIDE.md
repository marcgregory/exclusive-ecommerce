# TypeScript Guide

## Current Setup

The project now uses TypeScript for both the frontend and backend.

- Frontend entry: `frontend/src/main.tsx`
- Backend entry: `backend/src/index.ts`
- Backend types: `backend/src/types.ts`
- TypeScript config: `tsconfig.json`

## Commands

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' run typecheck
& 'C:\nvm4w\nodejs\npm.cmd' run build
& 'C:\nvm4w\nodejs\npm.cmd' test
```

## Backend Import Style

Backend TypeScript files use ESM-compatible imports. Keep `.js` in relative import specifiers even when importing `.ts` files:

```ts
import { loadStore } from "./store.js";
```

This matches Node ESM output conventions and works with `tsx` during development.

## Adding Types

Add backend API/domain types to `backend/src/types.ts`.

For frontend-only UI types, keep them near the component while small. Move shared types to `frontend/src/types/index.ts` once multiple files need them.

## Safety Rules

- Run `npm run typecheck` before major commits.
- Keep API response shapes typed at call sites, for example `api<{ cart: Cart }>("/api/cart")`.
- Avoid `any` for new domain objects. Use explicit types in `backend/src/types.ts`.
