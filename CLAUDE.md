# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Project Rules

These are non-negotiable requirements for safe operation, especially in production.

### Production Authentication
- **Production requirements**: `sameSite: "none"`, `secure: true`
- **Development requirements**: `sameSite: "lax"`, `secure: false`
- All authenticated frontend requests must use `credentials: "include"`
- Backend CORS must:
  - Allow the frontend origin
  - Allow credentials
- **Failure symptom**: Authenticated users receive `{"message":"Authentication required"}`
- **Verification**: Check cookie settings in application/storage (devtools) and network requests for `Set-Cookie` and `Cookie` headers
- **Safe fix**: Never change SameSite behavior without verifying cross-site authentication works in production-like conditions

### Session Handling
- Never modify session cookie security settings for convenience
- Never disable authentication to "fix" bugs
- Session secrets must be at least 32 characters in production
- Never commit session secrets to repository

### CORS Configuration
- Always verify origin and credentials settings match deployment environments
- Test CORS with actual frontend domain (not localhost) in production-like testing
- Never use wildcards (`*`) for origins when credentials are involved

### Credentials & Secrets
- Never commit secrets (API keys, database URLs, etc.)
- Never hardcode credentials in source code
- Use environment variables for all secrets
- Load secrets only from process.env, never from config files in repo

### Database Safety
- Never modify production database data without explicit instruction
- Always use `TEST_DATABASE_URL` for testing, never production DATABASE_URL
- Verify migration scripts are backward-compatible before running
- Never run `db:migrate` or `db:seed` against production without explicit approval

### Environment Variables
- Never commit `.env` files containing secrets
- Use `.env.example` for template without actual values
- Validate required environment variables at application startup
- Never override core infrastructure variables (like PORT) without understanding impact

## Known Production Issues

Documented issues and their resolutions to prevent recurrence.

### Session Cookie Not Sent
- **Symptom**: Authenticated users get 401/Auto logged out on cross-site requests
- **Root cause**: SameSite=lax or secure=false in production
- **Verification**: Check `Set-Cookie` header in production response; ensure `SameSite=None; Secure`
- **Fix**: Set `sameSite: "none"`, `secure: true` in production session config

### CORS Misconfiguration
- **Symptom**: Frontend requests blocked by browser; console shows CORS errors
- **Root cause**: Missing `Access-Control-Allow-Credentials: true` or incorrect origin
- **Verification**: Check backend response headers for CORS on actual requests
- **Fix**: Configure CORS with exact frontend origin and `credentials: true`

### Environment Variable Mismatch
- **Symptom**: Application crashes or behaves unexpectedly in production
- **Root cause**: Missing or incorrect env vars (e.g., DATABASE_URL pointing to test DB)
- **Verification**: Compare `.env` files across environments; validate at startup
- **Fix**: Use consistent naming; validate required vars; use prefixes (e.g., VITE_ for frontend)

### Database Migration Mistakes
- **Symptom**: Data loss, schema mismatches, application errors after deploy
- **Root cause**: Running migrations without backup; destructive changes in migration
- **Verification**: Test migrations on staging copy of production schema
- **Fix**: Always backup before migration; test migrations; use additive changes first

### Vercel/Render Deployment Mismatches
- **Symptom**: Works locally but fails after deploy (404s, missing env vars)
- **Root cause**: Different build/output directories; missing platform-specific config
- **Verification**: Check build logs; compare local build output to deployed
- **Fix**: Use platform-specific configs (vercel.json, render.yaml); match build commands

## Do Not Change Without Explicit Approval

Modifying these areas requires impact analysis and explicit user approval:

- Authentication/session handling (cookie settings, session store)
- CORS configuration (origins, credentials, headers)
- Database schema (tables, columns, constraints)
- Payment integrations (API keys, webhook secrets, provider config)
- Cloudinary/storage integrations (upload presets, API credentials)
- Deployment configuration (build scripts, start commands, platform configs)
- Environment variable structure (names, required variables, defaults)
- Security-related middleware (helmet, rate limiting, CSRF protection)

## Agent Workflow Requirements

Follow this process for all code changes:

### Before Coding
1. Read relevant files to understand current implementation
2. Explain the root cause of the issue being addressed
3. Propose a fix that addresses root cause without side effects
4. List all files that will be impacted by the change

### Before Completing Work
1. Run type checking (`npm run typecheck`) in affected directories
2. Run tests when available (`npm test` or specific test files)
3. Verify no regressions were introduced by testing related functionality
4. Summarize all changes made (files modified, lines added/removed)

## Production Safety Rules

Absolute prohibitions for safe operation:

- Never commit secrets to version control (use .gitignore)
- Never hardcode credentials or configuration values
- Never modify production database data without explicit instruction and backup
- Never remove security protections (authentication, encryption, input validation) for convenience
- Never disable authentication to "fix" bugs or bypass errors
- Never weaken cookie security settings (SameSite, Secure) without production verification
- Never override CORS security (origins, credentials) without testing cross-site scenarios
- Never run destructive database operations (DROP, DELETE without WHERE) in production

## Architecture Decision Records

### Decision: Cross-site Authentication between Vercel Frontend and Render Backend
- **Reason**: Frontend and backend are deployed on different domains (Vercel vs Render)
- **Requirements**:
  - Session cookies must use `SameSite=None` and `Secure=true`
  - All authenticated frontend requests must include `credentials: "include"`
  - Backend CORS must explicitly allow the frontend origin and credentials
- **Status**: Project-wide architectural requirement, not a temporary workaround
- **Verification**: Test authentication flow with production-like domains

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
  - **Important**: To run migrations and seeding against a production database (like Neon PostgreSQL), set the `DATABASE_URL` environment variable from your production `.env` file before running the commands. For example: `export DATABASE_URL="your-production-url" && npm run db:migrate`. Never commit actual database credentials to the repository.
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

- ESLint and Prettier are configured for both frontend and backend
- Linting: Run `npm run lint` in either `backend` or `frontend` directories
- Auto-fix formatting: Run `npm run format` in either directory
- Check formatting: Run `npm run format:check` in either directory
- Type checking: Run `npm run typecheck` in either directory

## Deployment

- Frontend: Deploy to Vercel (root directory: `frontend`, build command: `npm run build`, output directory: `dist`).
- Backend: Deploy to Render (root directory: `backend`, build command: `npm ci && npm run build`, start command: `npm start`).
- See `docs/DEPLOYMENT.md` for detailed environment variables required for Render and Vercel.

## Production Authentication

Deployment:

* Frontend: Vercel
* Backend: Render

Authentication uses HTTP-only session cookies.

Production requirements:

* sameSite: "none"
* secure: true

Development requirements:

* sameSite: "lax"
* secure: false

Because frontend and backend are hosted on different domains, production authentication is cross-site.

All authenticated frontend requests must use:

* credentials: "include"

Backend CORS must:

* allow the frontend origin
* allow credentials

Important:
Do not change cookie SameSite behavior without verifying production authentication.

Reason:
Using SameSite=lax in production prevents session cookies from being sent on cross-site requests, causing authenticated users to receive:
{"message":"Authentication required"}

This is a project-wide deployment requirement, not a temporary bug fix.