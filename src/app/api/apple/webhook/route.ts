import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { renderTemplate } from "@/lib/email-renderer";
import { notifyAdmins } from "@/lib/admin-notify";
import { getAppleVerifier, getAppleEnvironments, Environment } from "@/lib/apple-server";

/**
 * Try to verify and decode an Apple notification with both environments.
 * Sandbox notifications come from TestFlight / sandbox testers / App Review.
 */
async function verifyNotification(signedPayload: string) {
  const [primary, fallback] = getAppleEnvironments();
  for (const env of [primary, fallback]) {
    const envName = env === Environment.PRODUCTION ? "PRODUCTION" : "SANDBOX";
    const verifier = getAppleVerifier(env);
    if (!verifier) continue;
    try {
      const notification = await verifier.verifyAndDecodeNotification(signedPayload);
      log.debug("apple/webhook", `Notification verified via ${envName}`);
      return { notification, verifier };
    } catch (err) {
      log.debug("apple/webhook", `${envName} verification failed:`, err);
    }
  }
  return null;
}

/**
 * POST /api/apple/webhook
 * Apple App Store Server Notifications V2.
 * Apple sends JWS-signed payloads — no shared secret needed.
 * Handles subscription lifecycle: renewals, cancellations, expirations, billing issues.
 * Tries both production and sandbox verifiers.
 */
export async function POST(req: NextRequest) {
  let body: { signedPayload?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { signedPayload } = body;
  if (!signedPayload) {
    return NextResponse.json({ error: "Missing signedPayload" }, { status: 400 });
  }

  try {
    // Verify JWS signature using Apple root CA certs — try both environments
    const result = await verifyNotification(signedPayload);
    if (!result) {
      log.error("apple/webhook", "Failed to verify notification in any environment");
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    const { notification, verifier } = result;
    const notificationType = notification.notificationType;
    const subtype = notification.subtype;
    const signedTransactionInfo = notification.data?.signedTransactionInfo;

    log.info("apple/webhook", `Notification: ${notificationType} (${subtype ?? "no subtype"})`);

    if (!signedTransactionInfo) {
      log.info("apple/webhook", `No transaction info for ${notificationType}, skipping`);
      return NextResponse.json({ received: true });
    }

    // Decode the transaction using the same verifier that worked for the notification
    const txn = await verifier.verifyAndDecodeTransaction(signedTransactionInfo);
    const originalTransactionId = txn.originalTransactionId;
    const productId = txn.productId;

    if (!originalTransactionId) {
      log.warn("apple/webhook", "No originalTransactionId in transaction");
      return NextResponse.json({ received: true });
    }

    // Look up user via appleOriginalTransactionId (set during /api/apple/verify)
    const subscription = await db.subscription.findFirst({
      where: { appleOriginalTransactionId: originalTransactionId },
      select: { userId: true },
    });

    if (!subscription) {
      log.warn("apple/webhook", `No subscription found for originalTxn=${originalTransactionId}`);
      return NextResponse.json({ received: true });
    }

    const userId = subscription.userId;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      log.error("apple/webhook", `User not found: ${userId}`);
      return NextResponse.json({ received: true });
    }

    switch (notificationType) {
      case "DID_RENEW": {
        const expirationDate = txn.expiresDate ? new Date(txn.expiresDate) : undefined;
        const purchaseDate = txn.purchaseDate ? new Date(txn.purchaseDate) : new Date();

        await db.subscription.updateMany({
          where: { userId, paymentSource: "APPLE" },
          data: {
            status: "ACTIVE",
            currentPeriodStart: purchaseDate,
            currentPeriodEnd: expirationDate ?? undefined,
            cancelAtPeriodEnd: false,
          },
        });
        log.info("apple/webhook", `Subscription renewed for user ${userId}`);
        break;
      }

      case "DID_CHANGE_RENEWAL_STATUS": {
        // subtype: AUTO_RENEW_DISABLED = user turned off auto-renew (cancel at period end)
        // subtype: AUTO_RENEW_ENABLED = user re-enabled auto-renew
        if (subtype === "AUTO_RENEW_DISABLED") {
          await db.subscription.updateMany({
            where: { userId, paymentSource: "APPLE" },
            data: { cancelAtPeriodEnd: true },
          });
          await logAudit(userId, "SUBSCRIPTION_CHANGE", { action: "cancel_at_period_end", source: "APPLE" });
          log.info("apple/webhook", `Auto-renew disabled for user ${userId}`);
        } else if (subtype === "AUTO_RENEW_ENABLED") {
          await db.subscription.updateMany({
            where: { userId, paymentSource: "APPLE" },
            data: { cancelAtPeriodEnd: false },
          });
          await logAudit(userId, "SUBSCRIPTION_CHANGE", { action: "resume", source: "APPLE" });
          log.info("apple/webhook", `Auto-renew re-enabled for user ${userId}`);
        }
        break;
      }

      case "EXPIRED": {
        await db.subscription.updateMany({
          where: { userId, paymentSource: "APPLE" },
          data: { status: "CANCELED", tier: "FREE" },
        });

        const { subject, html } = await renderTemplate("subscriptionCanceled", {
          userName: user.name ?? "there",
          endDate: new Date().toLocaleDateString(),
        });
        await sendEmail(user.email, subject, html);
        await logAudit(userId, "SUBSCRIPTION_CHANGE", { action: "expired", source: "APPLE" });
        await notifyAdmins(
          "Subscription expired (Apple)",
          `<h2>Subscription Expired (Apple)</h2><p><strong>User:</strong> ${user.name ?? "Unknown"} (${user.email})</p><p><strong>Product:</strong> ${productId}</p><p><strong>Time:</strong> ${new Date().toISOString()}</p>`,
        );
        break;
      }

      case "DID_FAIL_TO_RENEW": {
        await db.subscription.updateMany({
          where: { userId, paymentSource: "APPLE" },
          data: { status: "PAST_DUE" },
        });
        log.info("apple/webhook", `Billing issue for user ${userId}`);
        break;
      }

      case "REFUND":
      case "REVOKE": {
        await db.subscription.updateMany({
          where: { userId, paymentSource: "APPLE" },
          data: { status: "CANCELED", tier: "FREE" },
        });
        await logAudit(userId, "SUBSCRIPTION_CHANGE", { action: notificationType === "REFUND" ? "refund" : "revoke", source: "APPLE" });
        await notifyAdmins(
          `Subscription ${notificationType === "REFUND" ? "refunded" : "revoked"} (Apple)`,
          `<h2>Subscription ${notificationType === "REFUND" ? "Refunded" : "Revoked"} (Apple)</h2><p><strong>User:</strong> ${user.name ?? "Unknown"} (${user.email})</p><p><strong>Product:</strong> ${productId}</p><p><strong>Time:</strong> ${new Date().toISOString()}</p>`,
        );
        log.info("apple/webhook", `${notificationType} processed for user ${userId}`);
        break;
      }

      case "GRACE_PERIOD_EXPIRED": {
        await db.subscription.updateMany({
          where: { userId, paymentSource: "APPLE" },
          data: { status: "CANCELED", tier: "FREE" },
        });
        await logAudit(userId, "SUBSCRIPTION_CHANGE", { action: "grace_period_expired", source: "APPLE" });
        log.info("apple/webhook", `Grace period expired for user ${userId}`);
        break;
      }

      default:
        log.info("apple/webhook", `Unhandled notification type: ${notificationType}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    log.error("apple/webhook", "Failed to process notification:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }
}
