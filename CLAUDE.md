# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- Install dependencies: Run `npm install` in both `backend` and `frontend` directories.
- Start development server:
  - Backend: `cd backend && npm run dev`
  - Frontend: `cd frontend && npm run dev`
- Type checking: `npm run typecheck` in either backend or frontend.
- Build for production:
  - Backend: `cd backend && npm run build`
  - Frontend: `cd frontend && npm run build`
- Run tests:
  - Backend: `cd backend && npm test`
  - Frontend: `cd frontend && npm test`
- Run a single test (using Vitest):
  - Backend: `cd backend && npx vitest run test/test-file.test.ts -t "test name"`
  - Frontend: similar.
- Database migrations and seeding (backend):
  - Migrate: `cd backend && npm run db:migrate`
  - Seed: `cd backend && npm run db:seed`
- Docker commands (use docker-compose directly as there are no root npm scripts):
  - Start: `docker-compose up`
  - Stop: `docker-compose down`
  - Rebuild: `docker-compose up --build`
  - Note: The README mentions `npm run docker:up` etc., but these scripts are not present; use docker-compose commands instead.

## Architecture Overview

- Frontend: React + Vite + TypeScript, located in `frontend/src/`.
  - Entry point: `frontend/src/main.tsx`
  - Components: `frontend/src/components/`
  - Pages: `frontend/src/pages/`
  - API helper: `frontend/src/api/client.ts`
  - Types: `frontend/src/types/index.ts`
  - Styling: `frontend/src/styles.css` (uses CSS variables for design tokens: --accent, --soft, --container)
- Backend: Node/Express + TypeScript, located in `backend/src/`.
  - Entry point: `backend/src/index.ts`
  - API routes: defined in `index.ts` and grouped by feature (auth, products, cart, wishlist, orders, contact, etc.)
  - Data store: `backend/src/store.ts` (PostgreSQL-backed repository functions)
  - Database connection: `backend/src/db.ts`
  - Types: `backend/src/types.ts`
  - Schema: `backend/src/schema.sql`
  - Seed data: `backend/src/data/store.json` (used by seed script)
- Database: PostgreSQL, with schema defined in `backend/src/schema.sql`.
- Docker: Local development stack defined in `docker-compose.yml` (services: postgres, backend, frontend).

## Environment Variables

- Backend (see `.env` example or docs):
  - `DATABASE_URL`: PostgreSQL connection string.
  - `SESSION_SECRET`: For session signing (min 32 chars in production).
  - `WEB_ORIGIN`: Frontend origin for CORS in production.
  - `PAYMENT_PROVIDER`: `local` or `stripe`.
  - `STRIPE_SECRET_KEY`: Required for Stripe mode.
  - `STRIPE_WEBHOOK_SECRET`: For Stripe webhook verification.
  - `IMAGE_STORAGE_PROVIDER`: `local` or `cloudinary`.
  - `CLOUDINARY_URL` or `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: For Cloudinary image storage.
- Frontend:
  - `VITE_API_BASE`: Base URL for API calls (defaults to `http://127.0.0.1:4000`).

## Testing

- Uses Vitest for both frontend and backend.
- Tests are located alongside source files (e.g., `*.test.ts`).
- To run all tests: `npm test` in the respective directory.
- To run a single test file: `npx vitest run path/to/test.test.ts`
- To run tests matching a pattern: `npx vitest run -t "pattern"`
- Backend tests require a test database: set `TEST_DATABASE_URL` environment variable.
- **Important**: Cloudinary uploads are mocked during tests when `NODE_ENV` is set to "test", so no actual Cloudinary credentials are required for running the test suite. This ensures tests don't depend on external services or expose secrets.

## Linting and Formatting

- Currently, no configured linter or formatter in the repository. Code style should follow the existing conventions in the codebase.
- Consider adding ESLint and Prettier for consistent style.

## Deployment

- Frontend: Deploy to Vercel (root directory: `frontend`, build command: `npm run build`, output directory: `dist`).
- Backend: Deploy to Render (root directory: `backend`, build command: `npm ci && npm run build`, start command: `npm start`).
- See `docs/DEPLOYMENT.md` for detailed environment variables required for Render and Vercel.