# Architecture Guide

## Overview

Exclusive is a full-stack ecommerce app with a React/Vite frontend and a Node/Express backend.

- Frontend source: `frontend/src/`
- Backend source: `backend/src/`
- Database schema: `backend/src/schema.sql`
- Local Docker stack: root `docker-compose.yml`

The app currently uses a JSON-backed store for fast local development. The schema is PostgreSQL-ready so the backend can be moved to a real database without changing the frontend API contract.

## Runtime Flow

1. The browser loads the React app from Vite.
2. React calls the Express API through `VITE_API_BASE`, defaulting to `http://127.0.0.1:4000`.
3. Express reads and writes ecommerce state through `backend/src/store.ts`.
4. PostgreSQL stores ecommerce data locally, in CI, and in production.

## Main Domains

- Products and categories power browsing, product details, homepage sections, and related items.
- Cart stores selected products, quantity, size, color, and totals.
- Wishlist stores saved product ids for the active user.
- Orders are created from the current cart during checkout.
- Contact messages are stored for later admin/review workflows.

## Design Rules

The frontend follows the Figma-derived system:

- Desktop baseline: 1440px canvas
- Main content width: 1170px
- Accent: `#db4444`
- Product panels: `#f5f5f5`
- Typography: Poppins for body, Inter for logo/headline text
- Controls: 4px radius
- Product cards: 270px desktop width
