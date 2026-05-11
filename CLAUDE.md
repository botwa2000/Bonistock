# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bonistock is a Next.js 16 stock and ETF recommendation platform with freemium tiers (free / pass / plus). It supports i18n across 5 locales, OAuth + credential auth, Stripe and Apple IAP billing, and an admin dashboard. The app is deployed to a Hetzner VPS via Docker Swarm.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript, `output: "standalone"`)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Database:** PostgreSQL 14 + Prisma 7 (`@prisma/adapter-pg` runtime adapter)
- **Auth:** NextAuth v5 (Auth.js) with JWT sessions, Prisma adapter
- **i18n:** `next-intl` with `localePrefix: "always"` (en, de, fr, es, it)
- **Payments:** Stripe (subscriptions + passes) + Apple In-App Purchases
- **Monitoring:** Sentry, PostHog, Google Analytics 4
- **Push:** APNs via `@parse/node-apn`
- **Mobile:** Capacitor iOS app wrapper

## Common Commands

```bash
# Development
npm run dev              # Start dev server on localhost:3000
npm run build            # Production build (also verifies types)
npm run lint             # Run ESLint (eslint-config-next)

# Database (requires DATABASE_URL env var)
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma db push       # Push schema changes (dev environments)
npx prisma migrate dev   # Create and apply a migration
npx prisma migrate deploy # Apply pending migrations (production)
npm run db:seed          # Run prisma/seed.ts (stocks, ETFs, brokers, demo portfolios)

# Running a single seed or script
npx tsx prisma/seed.ts
npx tsx scripts/<script>.ts
```

There is currently no test suite in the repo.

## High-Level Architecture

### App Router & i18n

All user-facing routes live under `src/app/[locale]/` with `[locale]` being one of `en`, `de`, `fr`, `es`, `it`. The root `src/app/layout.tsx` is non-locale; `src/app/[locale]/layout.tsx` wraps pages with `NextIntlClientProvider`, `AuthProvider`, `RegionProvider`, and `ThemeProvider`. `src/middleware.ts` handles locale routing, rate limiting, CSRF validation, and security headers.

Static params are generated for all locales (`src/app/[locale]/layout.tsx:generateStaticParams`). API routes live at `src/app/api/` (no locale prefix).

### Auth & Session Model

Auth is configured in `src/lib/auth.ts` using NextAuth v5 with:
- **JWT session strategy** (maxAge 7 days), Prisma adapter for account linking
- Providers: Google, Facebook, Apple OAuth + email/password credentials
- Custom cookie names with `__Secure-` prefix in production
- Account lockout after failed logins (`src/lib/lockout.ts`)
- 2FA support via TOTP (`src/lib/crypto.ts` for AES-256 encryption of secrets)
- Soft-delete restore on OAuth re-login

The JWT callback enriches the token with `role`, `region`, `theme`, `language`, and `goal` from the DB on every refresh. The session callback projects these onto the session object. The client-side `AuthProvider` (`src/lib/auth-context.tsx`) fetches full user data (including computed tier) from `/api/user/settings` and syncs locale/region cookies.

### Tier & Access Control

The tier system lives in `src/lib/tier.ts`:
- **FREE:** limited to weekly top-5 stock snapshot, basic ETF list
- **PASS:** time-activated day passes (1/3/12 day options). A pass has `activationsTotal` and `activationsUsed`; each activation creates a `PassActivation` row with an `expiresAt`.
- **PLUS:** active Stripe subscription or Apple IAP subscription

Dashboard sidebar links declare a `tier` property; the UI shows badges but does not gate navigation client-side — API routes enforce tier checks.

### Database Layer

`src/lib/db.ts` exports a singleton `PrismaClient` using the `@prisma/adapter-pg` adapter. In development it logs queries; in production only errors. The global variable prevents multiple instances during hot reload.

Key models to understand:
- `User` — profile, security (2FA, lockout), legal (TOS/privacy), soft-delete (`deletedAt`)
- `Subscription` — Stripe + Apple subscription state, linked to `User`
- `PassPurchase` / `PassActivation` — day-pass billing model
- `Stock` / `Etf` — current catalog data with `brokerAvailability` relations
- `StockSnapshot` — daily historical price/consensus data for tracking
- `DemoPortfolio` / `DemoPortfolioSnapshot` — seeded demo strategies with computed performance
- `UserPortfolio` / `UserPortfolioHolding` — user-created portfolios
- `Product` / `ProductPrice` / `RegionCurrency` — dynamic pricing catalog (no hardcoded Stripe IDs)
- `Promoter` / `Voucher` / `VoucherRedemption` / `PromoterCommission` — affiliate system

### API Route Patterns

Public API routes use `zod` for query/body validation. Authenticated routes use helpers in `src/lib/api-utils.ts`:
- `authenticatedRoute(handler)` — validates session, injects `{ userId, role }`
- `adminRoute(handler)` — extends authenticatedRoute, requires `role === "ADMIN"`
- `validateBody(schema, handler)` — extends authenticatedRoute with Zod body parsing

API mappers in `src/lib/api-mappers.ts` transform Prisma models to frontend DTOs (e.g., renaming fields, computing derived values).

### Data & External APIs

Stock/ETF data flows through `src/lib/data.ts` (DB queries) and `src/lib/fmp.ts` (Financial Modeling Prep API). The FMP module has a daily rate limit of 250 requests, tracked in the `RateLimit` table.

In production, stock discovery and ETF refresh run via external Python scripts (`scripts/discover.py`, `scripts/etf-discover.py`) triggered by the host crontab at 2 AM UTC. The dev environment can sync from prod via `STOCK_SYNC_SOURCE` env var + cron. Admin dashboard also exposes a manual "Discover Stocks" button.

### Cron Jobs (in-app)

`src/lib/cron.ts` schedules jobs via `node-cron`, initialized in `src/instrumentation.ts` (Node.js runtime only):
- Weekly ETF refresh — Sundays 3 AM UTC (no-op placeholder; handled by Python script)
- Daily demo portfolio snapshots — 4 AM UTC
- Alert evaluation — every 30 min, Mon–Fri 8:00–20:00 UTC

### Deployment

The app deploys to Docker Swarm on a Hetzner VPS. See `DEPLOY.md` for the full guide.

- **Dev:** `dev.bonistock.com` (port 3003), branch `dev`
- **Prod:** `bonistock.com` (port 3002), branch `main`

Key deployment notes:
- Secrets are Docker Swarm external secrets (prefix: `bonistock_dev_` / `bonistock_prod_`). `docker-entrypoint.sh` reads them from `/run/secrets/` and exports as env vars.
- `NEXT_PUBLIC_*` variables are build-time args baked into the Docker image.
- Prisma migrations run on the server before service update (see DEPLOY.md commands).
- `public/demo-portfolios.html` is served directly by nginx (bypassing Next.js) from `/var/www/bonistock-static/`.

### Env Validation

`src/lib/env.ts` validates required environment variables at startup using Zod. The app will throw and refuse to start if any required variable is missing. Key required vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FMP_API_KEY`, `BREVO_SMTP_USER`, `BREVO_SMTP_KEY`, `EMAIL_FROM`, `ENCRYPTION_KEY` (32-byte hex).

### File Structure Conventions

- `src/app/[locale]/` — Pages (landing, auth, dashboard, legal, marketing)
- `src/app/api/` — API routes (public, authenticated, admin, webhooks)
- `src/components/features/` — Page-level or complex feature components
- `src/components/layout/` — Shared layouts (navbar, footer, dashboard sidebar)
- `src/components/ui/` — Reusable UI primitives (button, card, input, badge, etc.)
- `src/lib/` — Shared utilities, data access, auth config, external API clients
- `messages/` — JSON translation files per locale
- `prisma/` — Schema, migrations, seed script
- `scripts/` — External Python scripts for stock/ETF discovery and data fetching
