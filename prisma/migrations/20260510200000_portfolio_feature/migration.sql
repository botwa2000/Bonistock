-- Portfolio feature migration
-- Replaces old Strategy enum, rewrites portfolio tables, adds EtfPriceCache, adds stock metrics

-- Drop tables that depend on old Strategy enum (no prod data yet)
DROP TABLE IF EXISTS "demo_portfolio_snapshots" CASCADE;
DROP TABLE IF EXISTS "demo_portfolios" CASCADE;
DROP TABLE IF EXISTS "user_portfolio_holdings" CASCADE;
DROP TABLE IF EXISTS "user_portfolios" CASCADE;

-- Drop old enums
DROP TYPE IF EXISTS "Strategy" CASCADE;
DROP TYPE IF EXISTS "WeightMode" CASCADE;
DROP TYPE IF EXISTS "AssetType" CASCADE;

-- Create new enums
CREATE TYPE "Strategy" AS ENUM ('ANALYST_CONVICTION', 'BALANCED', 'GROWTH', 'VALUE_INCOME', 'ETF_CORE', 'SECTOR_FOCUS', 'CUSTOM');
CREATE TYPE "WeightMode" AS ENUM ('EQUAL', 'UPSIDE_WEIGHTED', 'CUSTOM');
CREATE TYPE "AssetType" AS ENUM ('STOCK', 'ETF');

-- Demo portfolios (public, no auth)
CREATE TABLE "demo_portfolios" (
    "id" TEXT NOT NULL,
    "strategy" "Strategy" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "holdings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "demo_portfolios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "demo_portfolio_snapshots" (
    "id" TEXT NOT NULL,
    "demoPortfolioId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "returnPct" DOUBLE PRECISION NOT NULL,
    "holdings" JSONB NOT NULL,
    CONSTRAINT "demo_portfolio_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "demo_portfolio_snapshots_demoPortfolioId_date_key" ON "demo_portfolio_snapshots"("demoPortfolioId", "date");

ALTER TABLE "demo_portfolio_snapshots" ADD CONSTRAINT "demo_portfolio_snapshots_demoPortfolioId_fkey"
    FOREIGN KEY ("demoPortfolioId") REFERENCES "demo_portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- User portfolios (weight-based model portfolios)
CREATE TABLE "user_portfolios" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strategy" "Strategy" NOT NULL DEFAULT 'CUSTOM',
    "weightMode" "WeightMode" NOT NULL DEFAULT 'EQUAL',
    "filterConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_portfolios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_portfolio_holdings" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL DEFAULT 'STOCK',
    "weight" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "user_portfolio_holdings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_portfolio_holdings_portfolioId_symbol_key" ON "user_portfolio_holdings"("portfolioId", "symbol");

ALTER TABLE "user_portfolios" ADD CONSTRAINT "user_portfolios_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_portfolio_holdings" ADD CONSTRAINT "user_portfolio_holdings_portfolioId_fkey"
    FOREIGN KEY ("portfolioId") REFERENCES "user_portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ETF price history cache (yfinance results)
CREATE TABLE "etf_price_cache" (
    "symbol" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "etf_price_cache_pkey" PRIMARY KEY ("symbol")
);

-- Free yfinance metrics on stocks
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "beta" DOUBLE PRECISION;
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "pe" DOUBLE PRECISION;
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "weekHigh52" DOUBLE PRECISION;
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "weekLow52" DOUBLE PRECISION;
