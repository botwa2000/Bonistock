import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAuth } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { renderTemplate } from "@/lib/email-renderer";
import { notifyAdmins } from "@/lib/admin-notify";
import { sendPushToUser } from "@/lib/push";
import {
  getAndroidPublisher,
  getSubscriptionPurchase,
  getProductPurchase,
  acknowledgeProduct,
  acknowledgeSubscription,
} from "@/lib/google-play-server";

/**
 * POST /api/google-play/verify
 * The Android app sends { purchaseToken, productId } after a Play Billing purchase.
 * We verify it with the Developer API, then create/update DB records.
 * Mirrors /api/apple/verify.
 */
const schema = z.object({
  purchaseToken: z.string().min(1),
  productId: z.string().min(1),
});

const ACTIVE_SUB_STATES = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
]);

export async function POST(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = ctx.userId;

  if (!getAndroidPublisher()) {
    log.error("google-play/verify", "Google Play not configured");
    return NextResponse.json({ error: "Google Play not configured" }, { status: 500 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
  }
  const { purchaseToken, productId } = parsed.data;

  log.info("google-play/verify", `Verify request: product=${productId}, user=${userId}`);

  const dbProduct = await db.product.findFirst({
    where: { googlePlayProductId: productId, active: true },
  });
  if (!dbProduct) {
    log.warn("google-play/verify", `No active product for googlePlayProductId=${productId}`);
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    if (dbProduct.type === "SUBSCRIPTION") {
      const purchase = await getSubscriptionPurchase(purchaseToken);
      if (!purchase) {
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
      }

      const lineItem = (purchase.lineItems ?? []).find((li) => li.productId === productId)
        ?? (purchase.lineItems ?? [])[0];
      const state = purchase.subscriptionState ?? "";
      if (!ACTIVE_SUB_STATES.has(state)) {
        log.warn("google-play/verify", `Subscription not active (state=${state}) for user=${userId}`);
        return NextResponse.json({ error: "Subscription not active", code: "NOT_ACTIVE" }, { status: 400 });
      }

      const expiryTime = lineItem?.expiryTime ? new Date(lineItem.expiryTime) : null;
      const orderId = purchase.latestOrderId ?? null;

      await db.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: `gplay_${userId}`,
          tier: "PLUS",
          status: "ACTIVE",
          paymentSource: "GOOGLE_PLAY",
          googlePlayPurchaseToken: purchaseToken,
          googlePlayOriginalOrderId: orderId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: expiryTime,
        },
        update: {
          tier: "PLUS",
          status: "ACTIVE",
          paymentSource: "GOOGLE_PLAY",
          googlePlayPurchaseToken: purchaseToken,
          googlePlayOriginalOrderId: orderId,
          currentPeriodEnd: expiryTime,
          cancelAtPeriodEnd: false,
        },
      });

      if (purchase.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED") {
        await acknowledgeSubscription(productId, purchaseToken).catch((e) =>
          log.warn("google-play/verify", "acknowledgeSubscription failed:", e)
        );
      }

      const { subject, html } = await renderTemplate("subscriptionConfirmation", {
        userName: user.name ?? "there",
        tier: "Plus",
        amount: "Google Play",
      });
      await sendEmail(user.email, subject, html);
      await logAudit(userId, "SUBSCRIPTION_CHANGE", { action: "subscribe", tier: "PLUS", source: "GOOGLE_PLAY", productId });
      await notifyAdmins(
        "New Plus subscription (Google Play)",
        `<h2>New Plus Subscription (Google Play)</h2><p><strong>User:</strong> ${user.name ?? "Unknown"} (${user.email})</p><p><strong>Product:</strong> ${dbProduct.name} (${productId})</p><p><strong>Time:</strong> ${new Date().toISOString()}</p>`,
      );
      sendPushToUser(userId, {
        title: "Welcome to Plus!",
        body: "Your Bonistock Plus subscription is now active. Enjoy full access!",
      }).catch(() => {});
    } else if (dbProduct.type === "PASS" && dbProduct.passType && dbProduct.passDays) {
      const purchase = await getProductPurchase(productId, purchaseToken);
      if (!purchase) {
        return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
      }
      if (purchase.purchaseState !== 0) {
        return NextResponse.json({ error: "Purchase not completed", code: "NOT_PURCHASED" }, { status: 400 });
      }
      const orderId = purchase.orderId ?? null;

      // Idempotency: don't double-grant the same order.
      if (orderId) {
        const existing = await db.passPurchase.findUnique({ where: { googlePlayOrderId: orderId } });
        if (existing) {
          return NextResponse.json({ success: true, alreadyProcessed: true });
        }
      }

      await db.passPurchase.create({
        data: {
          userId,
          passType: dbProduct.passType,
          activationsTotal: dbProduct.passDays,
          activationsUsed: 0,
          googlePlayOrderId: orderId,
          paymentSource: "GOOGLE_PLAY",
        },
      });

      if (purchase.acknowledgementState === 0) {
        await acknowledgeProduct(productId, purchaseToken).catch((e) =>
          log.warn("google-play/verify", "acknowledgeProduct failed:", e)
        );
      }

      const passNames: Record<string, string> = { ONE_DAY: "1-Day Pass", THREE_DAY: "3-Day Pass", TWELVE_DAY: "12-Day Pass" };
      const passName = passNames[dbProduct.passType] ?? dbProduct.name;
      const { subject, html } = await renderTemplate("passConfirmation", {
        userName: user.name ?? "there",
        passType: passName,
        activations: String(dbProduct.passDays),
      });
      await sendEmail(user.email, subject, html);
      await logAudit(userId, "PASS_PURCHASE", { passType: dbProduct.passType, activations: dbProduct.passDays, source: "GOOGLE_PLAY" });
      await notifyAdmins(
        `Day Pass purchased (Google Play): ${passName}`,
        `<h2>Day Pass Purchased (Google Play)</h2><p><strong>User:</strong> ${user.name ?? "Unknown"} (${user.email})</p><p><strong>Pass:</strong> ${passName} (${dbProduct.passDays} activations)</p><p><strong>Time:</strong> ${new Date().toISOString()}</p>`,
      );
      sendPushToUser(userId, {
        title: "Pass Activated!",
        body: `Your ${passName} is ready. Enjoy full access!`,
      }).catch(() => {});
    } else {
      log.warn("google-play/verify", `Product ${productId} has invalid type/config`);
      return NextResponse.json({ error: "Invalid product configuration" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("google-play/verify", `Verification failed for product ${productId}:`, err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
