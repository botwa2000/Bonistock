import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { renderTemplate } from "@/lib/email-renderer";
import { notifyAdmins, escapeHtml } from "@/lib/admin-notify";
import { getSubscriptionPurchase } from "@/lib/google-play-server";

/**
 * POST /api/google-play/webhook
 * Google Play Real-time Developer Notifications (RTDN), delivered via a Pub/Sub
 * push subscription. The push request carries an OIDC bearer we verify against
 * Google's certs. We then re-fetch authoritative state from the Developer API and
 * map the notification type to the same Subscription transitions as the Apple webhook.
 *
 * Exempt from CSRF (see middleware) — it authenticates via the OIDC token instead.
 */

const googleCerts = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

// Subscription notification types: https://developer.android.com/google/play/billing/rtdn-reference
const SUB = {
  RECOVERED: 1,
  RENEWED: 2,
  CANCELED: 3,
  PURCHASED: 4,
  ON_HOLD: 5,
  IN_GRACE_PERIOD: 6,
  RESTARTED: 7,
  REVOKED: 12,
  EXPIRED: 13,
} as const;

interface DeveloperNotification {
  packageName?: string;
  subscriptionNotification?: {
    notificationType: number;
    purchaseToken: string;
    subscriptionId: string;
  };
  testNotification?: { version: string };
}

async function verifyPushAuth(req: NextRequest): Promise<boolean> {
  const audience = process.env.GOOGLE_PLAY_PUBSUB_AUDIENCE;
  if (!audience) {
    // No audience configured — cannot verify. Process but warn loudly.
    log.warn("google-play/webhook", "GOOGLE_PLAY_PUBSUB_AUDIENCE not set — skipping OIDC verification");
    return true;
  }
  const authz = req.headers.get("authorization");
  if (!authz?.startsWith("Bearer ")) return false;
  try {
    await jwtVerify(authz.slice(7).trim(), googleCerts, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience,
    });
    return true;
  } catch (err) {
    log.warn("google-play/webhook", "OIDC verification failed:", err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifyPushAuth(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message?: { data?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = body.message?.data;
  if (!data) {
    // Pub/Sub sometimes sends control messages — acknowledge so it isn't retried.
    return NextResponse.json({ received: true });
  }

  let notification: DeveloperNotification;
  try {
    notification = JSON.parse(Buffer.from(data, "base64").toString("utf8"));
  } catch {
    log.error("google-play/webhook", "Failed to decode message.data");
    return NextResponse.json({ received: true });
  }

  if (notification.testNotification) {
    log.info("google-play/webhook", "Received test notification");
    return NextResponse.json({ received: true });
  }

  const sub = notification.subscriptionNotification;
  if (!sub) {
    // One-time product / voided purchase notifications — not handled here yet.
    return NextResponse.json({ received: true });
  }

  log.info("google-play/webhook", `Subscription notification type=${sub.notificationType} token=${sub.purchaseToken.slice(0, 8)}…`);

  const subscription = await db.subscription.findFirst({
    where: { googlePlayPurchaseToken: sub.purchaseToken },
    select: { userId: true },
  });
  if (!subscription) {
    log.warn("google-play/webhook", "No subscription found for purchase token");
    return NextResponse.json({ received: true });
  }

  const userId = subscription.userId;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (sub.notificationType) {
      case SUB.RECOVERED:
      case SUB.RENEWED:
      case SUB.PURCHASED:
      case SUB.RESTARTED: {
        // Re-fetch authoritative expiry from the Developer API.
        const purchase = await getSubscriptionPurchase(sub.purchaseToken).catch(() => null);
        const expiry = purchase?.lineItems?.[0]?.expiryTime
          ? new Date(purchase.lineItems[0].expiryTime)
          : undefined;
        await db.subscription.updateMany({
          where: { userId, paymentSource: "GOOGLE_PLAY" },
          data: {
            status: "ACTIVE",
            tier: "PLUS",
            currentPeriodEnd: expiry,
            cancelAtPeriodEnd: false,
          },
        });
        log.info("google-play/webhook", `Subscription active for user ${userId}`);
        break;
      }

      case SUB.CANCELED: {
        await db.subscription.updateMany({
          where: { userId, paymentSource: "GOOGLE_PLAY" },
          data: { cancelAtPeriodEnd: true },
        });
        await logAudit(userId, "SUBSCRIPTION_CHANGE", { action: "cancel_at_period_end", source: "GOOGLE_PLAY" });
        log.info("google-play/webhook", `Subscription canceled (at period end) for user ${userId}`);
        break;
      }

      case SUB.ON_HOLD:
      case SUB.IN_GRACE_PERIOD: {
        await db.subscription.updateMany({
          where: { userId, paymentSource: "GOOGLE_PLAY" },
          data: { status: "PAST_DUE" },
        });
        log.info("google-play/webhook", `Billing issue (on-hold/grace) for user ${userId}`);
        break;
      }

      case SUB.REVOKED:
      case SUB.EXPIRED: {
        await db.subscription.updateMany({
          where: { userId, paymentSource: "GOOGLE_PLAY" },
          data: { status: "CANCELED", tier: "FREE" },
        });
        const { subject, html } = await renderTemplate("subscriptionCanceled", {
          userName: user.name ?? "there",
          endDate: new Date().toLocaleDateString(),
        });
        await sendEmail(user.email, subject, html);
        await logAudit(userId, "SUBSCRIPTION_CHANGE", {
          action: sub.notificationType === SUB.REVOKED ? "revoke" : "expired",
          source: "GOOGLE_PLAY",
        });
        await notifyAdmins(
          "Subscription ended (Google Play)",
          `<h2>Subscription Ended (Google Play)</h2><p><strong>User:</strong> ${escapeHtml(user.name ?? "Unknown")} (${escapeHtml(user.email)})</p><p><strong>Time:</strong> ${new Date().toISOString()}</p>`,
        );
        log.info("google-play/webhook", `Subscription ended for user ${userId}`);
        break;
      }

      default:
        log.info("google-play/webhook", `Unhandled notification type: ${sub.notificationType}`);
    }
  } catch (err) {
    log.error("google-play/webhook", "Failed to process notification:", err);
  }

  return NextResponse.json({ received: true });
}
