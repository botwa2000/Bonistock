-- Native mobile app support: bearer-token sessions + Google Play billing.
-- All additive and backward compatible (new enum value, nullable columns, new table).

-- Add GOOGLE_PLAY to the PaymentSource enum (PostgreSQL 14: ADD VALUE is transaction-safe)
ALTER TYPE "PaymentSource" ADD VALUE IF NOT EXISTS 'GOOGLE_PLAY' BEFORE 'ADMIN';

-- Google Play billing columns on existing payment tables
ALTER TABLE "subscriptions" ADD COLUMN "googlePlayPurchaseToken" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN "googlePlayOriginalOrderId" TEXT;
ALTER TABLE "pass_purchases" ADD COLUMN "googlePlayOrderId" TEXT;
ALTER TABLE "products" ADD COLUMN "googlePlayProductId" TEXT;

CREATE UNIQUE INDEX "subscriptions_googlePlayPurchaseToken_key" ON "subscriptions"("googlePlayPurchaseToken");
CREATE UNIQUE INDEX "subscriptions_googlePlayOriginalOrderId_key" ON "subscriptions"("googlePlayOriginalOrderId");
CREATE UNIQUE INDEX "pass_purchases_googlePlayOrderId_key" ON "pass_purchases"("googlePlayOrderId");
CREATE UNIQUE INDEX "products_googlePlayProductId_key" ON "products"("googlePlayProductId");

-- Mobile sessions (refresh tokens stored hashed, rotated on use)
CREATE TABLE "mobile_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "deviceId" TEXT,
    "userAgent" TEXT,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "mobile_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mobile_sessions_refreshTokenHash_key" ON "mobile_sessions"("refreshTokenHash");
CREATE INDEX "mobile_sessions_userId_idx" ON "mobile_sessions"("userId");

ALTER TABLE "mobile_sessions" ADD CONSTRAINT "mobile_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
