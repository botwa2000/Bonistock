/**
 * Server-side APNs push notifications via @parse/node-apn.
 */

import apn from "@parse/node-apn";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";

let provider: apn.Provider | null = null;

function getProvider(): apn.Provider | null {
  if (provider) return provider;

  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const keyP8 = process.env.APNS_KEY_P8;

  if (!keyId || !teamId || !keyP8) {
    log.warn("push", "APNs not configured — missing APNS_KEY_ID, APNS_TEAM_ID, or APNS_KEY_P8");
    return null;
  }

  provider = new apn.Provider({
    token: {
      key: keyP8,
      keyId,
      teamId,
    },
    production: process.env.NODE_ENV === "production",
  });

  return provider;
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const apnProvider = getProvider();
  if (!apnProvider) return;

  const bundleId = process.env.APNS_BUNDLE_ID ?? "com.bonifatus.bonistock";

  const tokens = await db.pushToken.findMany({
    where: { userId },
    select: { token: true, id: true },
  });

  if (tokens.length === 0) return;

  const notification = new apn.Notification();
  notification.alert = { title: payload.title, body: payload.body };
  notification.sound = "default";
  notification.topic = bundleId;
  if (payload.badge != null) notification.badge = payload.badge;
  if (payload.data) notification.payload = payload.data;

  const tokenValues = tokens.map((t) => t.token);

  try {
    const result = await apnProvider.send(notification, tokenValues);

    // Clean up stale tokens (APNs returns 410 for unregistered devices)
    const staleTokens = result.failed
      .filter((f) => f.status === 410 || f.response?.reason === "Unregistered")
      .map((f) => f.device);

    if (staleTokens.length > 0) {
      await db.pushToken.deleteMany({
        where: { token: { in: staleTokens } },
      });
      log.info("push", `Cleaned ${staleTokens.length} stale APNs tokens for user ${userId}`);
    }

    if (result.sent.length > 0) {
      log.info("push", `Sent push to ${result.sent.length} devices for user ${userId}`);
    }
  } catch (err) {
    log.error("push", `Failed to send push to user ${userId}:`, err);
  }
}
