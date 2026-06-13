/**
 * Server-side Google Play Developer API client (Android Publisher v3).
 * Mirrors src/lib/apple-server.ts: a memoized singleton, returns null when
 * unconfigured so routes can degrade gracefully.
 *
 * Auth: a service-account JSON (with the "View financial data / Manage orders"
 * permission in Play Console) supplied via GOOGLE_PLAY_SERVICE_ACCOUNT_JSON.
 */
import { androidpublisher, auth, type androidpublisher_v3 } from "@googleapis/androidpublisher";
import { log } from "@/lib/logger";

export const GOOGLE_PLAY_PACKAGE_NAME = "com.bonifatus.bonistock";

const SCOPES = ["https://www.googleapis.com/auth/androidpublisher"];

let client: androidpublisher_v3.Androidpublisher | null | undefined;

/** Returns the Android Publisher client, or null if the service account isn't configured. */
export function getAndroidPublisher(): androidpublisher_v3.Androidpublisher | null {
  if (client !== undefined) return client;

  const json = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!json) {
    log.warn("google-play-server", "Google Play not configured — missing GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
    client = null;
    return null;
  }

  try {
    const credentials = JSON.parse(json);
    const googleAuth = new auth.GoogleAuth({ credentials, scopes: SCOPES });
    client = androidpublisher({ version: "v3", auth: googleAuth });
    log.debug("google-play-server", "Android Publisher client created");
    return client;
  } catch (err) {
    log.error("google-play-server", "Failed to initialize Android Publisher client:", err);
    client = null;
    return null;
  }
}

/** Fetch a subscription purchase (v2) by its purchase token. */
export async function getSubscriptionPurchase(
  purchaseToken: string
): Promise<androidpublisher_v3.Schema$SubscriptionPurchaseV2 | null> {
  const api = getAndroidPublisher();
  if (!api) return null;
  const res = await api.purchases.subscriptionsv2.get({
    packageName: GOOGLE_PLAY_PACKAGE_NAME,
    token: purchaseToken,
  });
  return res.data;
}

/** Fetch a one-time (consumable/non-consumable) product purchase by token. */
export async function getProductPurchase(
  productId: string,
  purchaseToken: string
): Promise<androidpublisher_v3.Schema$ProductPurchase | null> {
  const api = getAndroidPublisher();
  if (!api) return null;
  const res = await api.purchases.products.get({
    packageName: GOOGLE_PLAY_PACKAGE_NAME,
    productId,
    token: purchaseToken,
  });
  return res.data;
}

/** Acknowledge a one-time product purchase (required within 3 days or Google refunds). */
export async function acknowledgeProduct(productId: string, purchaseToken: string): Promise<void> {
  const api = getAndroidPublisher();
  if (!api) return;
  await api.purchases.products.acknowledge({
    packageName: GOOGLE_PLAY_PACKAGE_NAME,
    productId,
    token: purchaseToken,
  });
}

/** Acknowledge a subscription purchase. `subscriptionId` is the Play product id. */
export async function acknowledgeSubscription(subscriptionId: string, purchaseToken: string): Promise<void> {
  const api = getAndroidPublisher();
  if (!api) return;
  await api.purchases.subscriptions.acknowledge({
    packageName: GOOGLE_PLAY_PACKAGE_NAME,
    subscriptionId,
    token: purchaseToken,
  });
}
