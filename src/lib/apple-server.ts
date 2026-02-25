/**
 * Server-side Apple App Store Server API client + JWS verifier.
 * Singleton pattern (same as push.ts).
 * Uses @apple/app-store-server-library for JWT auth and JWS verification.
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

let apiClient: AppStoreServerAPIClient | null = null;
let verifier: SignedDataVerifier | null = null;

function getEnvironment(): Environment {
  return process.env.NODE_ENV === "production"
    ? Environment.PRODUCTION
    : Environment.SANDBOX;
}

export function getAppleApiClient(): AppStoreServerAPIClient | null {
  if (apiClient) return apiClient;

  const keyP8 = process.env.APPLE_IAP_KEY_P8;
  const keyId = process.env.APPLE_IAP_KEY_ID;
  const issuerId = process.env.APPLE_IAP_ISSUER_ID;

  if (!keyP8 || !keyId || !issuerId) {
    log.warn("apple-server", "Apple IAP not configured — missing APPLE_IAP_KEY_P8, APPLE_IAP_KEY_ID, or APPLE_IAP_ISSUER_ID");
    return null;
  }

  apiClient = new AppStoreServerAPIClient(
    keyP8,
    keyId,
    issuerId,
    BUNDLE_ID,
    getEnvironment(),
  );

  return apiClient;
}

export function getAppleVerifier(): SignedDataVerifier | null {
  if (verifier) return verifier;

  const appAppleId = process.env.APPLE_APP_ID
    ? Number(process.env.APPLE_APP_ID)
    : undefined;

  // In production, appAppleId is required
  if (getEnvironment() === Environment.PRODUCTION && !appAppleId) {
    log.warn("apple-server", "Apple IAP not configured — missing APPLE_APP_ID (required for production)");
    return null;
  }

  try {
    const certsDir = join(process.cwd(), "certs");
    const rootCAs: Buffer[] = [
      readFileSync(join(certsDir, "AppleRootCA-G3.cer")),
      readFileSync(join(certsDir, "AppleRootCA-G2.cer")),
      readFileSync(join(certsDir, "AppleWWDRCAG6.cer")),
    ];

    verifier = new SignedDataVerifier(
      rootCAs,
      true,
      getEnvironment(),
      BUNDLE_ID,
      appAppleId,
    );

    return verifier;
  } catch (err) {
    log.error("apple-server", "Failed to initialize Apple JWS verifier:", err);
    return null;
  }
}
