-- Migration: Rename Region enum value US → GLOBAL
-- Run once against both prod and dev databases before deploying the new code.
--
-- 1. Rename the enum value
ALTER TYPE "Region" RENAME VALUE 'US' TO 'GLOBAL';

-- 2. One-time fix: backdate stocks/etfs createdAt so they don't all show "NEW"
UPDATE stocks SET "createdAt" = NOW() - INTERVAL '30 days' WHERE "createdAt" > NOW() - INTERVAL '8 days';
UPDATE etfs   SET "createdAt" = NOW() - INTERVAL '30 days' WHERE "createdAt" > NOW() - INTERVAL '8 days';
