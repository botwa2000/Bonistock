-- Add WEBAUTHN_CHALLENGE to TokenType enum
ALTER TYPE "TokenType" ADD VALUE IF NOT EXISTS 'WEBAUTHN_CHALLENGE';

-- Create rate_limits table for distributed rate limiting and FMP daily counter
CREATE TABLE IF NOT EXISTS "rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "reset_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);
