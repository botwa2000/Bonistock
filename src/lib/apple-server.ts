/**
 * Server-side Apple App Store Server API client + JWS verifier.
 * Singleton pattern (same as push.ts).
 * Uses @apple/app-store-server-library for JWT auth and JWS verification.
 *
 * Supports both PRODUCTION and SANDBOX environments.
 * TestFlight, sandbox testers, and App Review all use SANDBOX,
 * while real App Store purchases use PRODUCTION.
 * The verify/webhook routes should try both when needed.
 */

import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
} from "@apple/app-store-server-library";
import { readFileSync } from "fs";
import { join } from "path";
import { log } from "@/lib/logger";

const BUNDLE_ID = "com.bonifatus.bonistock";

const apiClients = new Map<Environment, AppStoreServerAPIClient>();
const verifiers = new Map<Environment, SignedDataVerifier>();

/** Primary environment based on NODE_ENV (can be overridden via APPLE_IAP_ENVIRONMENT). */
function getPrimaryEnvironment(): Environment {
  const override = process.env.APPLE_IAP_ENVIRONMENT?.toLowerCase();
  if (override === "sandbox") return Environment.SANDBOX;
  if (override === "production") return Environment.PRODUCTION;
  return process.env.NODE_ENV === "production"
    ? Environment.PRODUCTION
    : Environment.SANDBOX;
}

function getCredentials() {
  const keyP8 = process.env.APPLE_IAP_KEY_P8;
  const keyId = process.env.APPLE_IAP_KEY_ID;
  const issuerId = process.env.APPLE_IAP_ISSUER_ID;
  if (!keyP8 || !keyId || !issuerId) return null;
  return { keyP8, keyId, issuerId };
}

function loadRootCAs(): Buffer[] {
  const certsDir = join(process.cwd(), "certs");
  return [
    readFileSync(join(certsDir, "AppleRootCA-G3.cer")),
    readFileSync(join(certsDir, "AppleRootCA-G2.cer")),
    readFileSync(join(certsDir, "AppleWWDRCAG6.cer")),
  ];
}

/**
 * Get an Apple API client for the given environment.
 * Defaults to the primary environment if not specified.
 */
export function getAppleApiClient(env?: Environment): AppStoreServerAPIClient | null {
  const targetEnv = env ?? getPrimaryEnvironment();
  if (apiClients.has(targetEnv)) return apiClients.get(targetEnv)!;

  const creds = getCredentials();
  if (!creds) {
    log.warn("apple-server", "Apple IAP not configured — missing APPLE_IAP_KEY_P8, APPLE_IAP_KEY_ID, or APPLE_IAP_ISSUER_ID");
    return null;
  }

  const client = new AppStoreServerAPIClient(
    creds.keyP8,
    creds.keyId,
    creds.issuerId,
    BUNDLE_ID,
    targetEnv,
  );
  apiClients.set(targetEnv, client);
  log.debug("apple-server", `Created API client for ${targetEnv === Environment.PRODUCTION ? "PRODUCTION" : "SANDBOX"}`);
  return client;
}

/**
 * Get a JWS verifier for the given environment.
 * Defaults to the primary environment if not specified.
 */
export function getAppleVerifier(env?: Environment): SignedDataVerifier | null {
  const targetEnv = env ?? getPrimaryEnvironment();
  if (verifiers.has(targetEnv)) return verifiers.get(targetEnv)!;

  const appAppleId = process.env.APPLE_APP_ID
    ? Number(process.env.APPLE_APP_ID)
    : undefined;

  // In production, appAppleId is required
  if (targetEnv === Environment.PRODUCTION && !appAppleId) {
    log.warn("apple-server", "Apple IAP not configured — missing APPLE_APP_ID (required for production)");
    return null;
  }

  try {
    const rootCAs = loadRootCAs();
    const v = new SignedDataVerifier(
      rootCAs,
      true,
      targetEnv,
      BUNDLE_ID,
      appAppleId,
    );
    verifiers.set(targetEnv, v);
    log.debug("apple-server", `Created JWS verifier for ${targetEnv === Environment.PRODUCTION ? "PRODUCTION" : "SANDBOX"}`);
    return v;
  } catch (err) {
    log.error("apple-server", "Failed to initialize Apple JWS verifier:", err);
    return null;
  }
}

/**
 * Returns [primary, fallback] environments for trying both.
 * Primary is based on NODE_ENV / APPLE_IAP_ENVIRONMENT.
 */
export function getAppleEnvironments(): [Environment, Environment] {
  const primary = getPrimaryEnvironment();
  const fallback = primary === Environment.PRODUCTION
    ? Environment.SANDBOX
    : Environment.PRODUCTION;
  return [primary, fallback];
}

export { Environment };
