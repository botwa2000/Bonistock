import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { renderTemplate } from "@/lib/email-renderer";
import { notifyAdmins } from "@/lib/admin-notify";
import { sendPushToUser } from "@/lib/push";

const PASS_MAP: Record<string, { type: "ONE_DAY" | "THREE_DAY" | "TWELVE_DAY"; count: number }> = {
  "com.bonifatus.bonistock.pass.1day": { type: "ONE_DAY", count: 1 },
  "com.bonifatus.bonistock.pass.3day": { type: "THREE_DAY", count: 3 },
  "com.bonifatus.bonistock.pass.12day": { type: "TWELVE_DAY", count: 12 },
};

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.error("revenuecat/webhook", "Missing REVENUECAT_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Verify authorization header
  const authHeader = req.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
    log.error("revenuecat/webhook", "Invalid authorization header");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { event?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = body.event;
  if (!event) {
    return NextResponse.json({ error: "Missing event" }, { status: 400 });
  }

  const eventType = event.type as string;
  const userId = event.app_user_id as string;
  const productId = event.product_id as string;
  const originalTransactionId = event.original_transaction_id as string | undefined;
  const transactionId = event.transaction_id as string | undefined;

  log.info("revenuecat/webhook", `Event: ${eventType}, user=${userId}, product=${productId}`);

  if (!userId) {
    log.error("revenuecat/webhook", "Missing app_user_id");
    return NextResponse.json({ received: true });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    log.error("revenuecat/webhook", `User not found: ${userId}`);
    return NextResponse.json({ received: true });
  }

  const isSubscription = productId?.startsWith("com.bonifatus.bonistock.plus.");
  const passConfig = productId ? PASS_MAP[productId] : undefined;

  switch (eventType) {
    case "INITIAL_PURCHASE": {
      if (isSubscription) {
        // Upsert subscription for Apple purchase
        const expirationDate = event.expiration_at_ms
          ? new Date(event.expiration_at_ms as number)
          : undefined;
        const purchaseDate = event.purchase_date_ms
          ? new Date(event.purchase_date_ms as number)
          : new Date();

        await db.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: `apple_${userId}`,
            tier: "PLUS",
            status: "ACTIVE",
            paymentSource: "APPLE",
            appleOriginalTransactionId: originalTransactionId ?? null,
            currentPeriodStart: purchaseDate,
            currentPeriodEnd: expirationDate ?? null,
          },
          update: {
            tier: "PLUS",
            status: "ACTIVE",
            paymentSource: "APPLE",
            appleOriginalTransactionId: originalTransactionId ?? null,
            currentPeriodStart: purchaseDate,
            currentPeriodEnd: expirationDate ?? null,
            cancelAtPeriodEnd: false,
          },
        });

        const { subject, html } = await renderTemplate("subscriptionConfirmation", {
          userName: user.name ?? "there",
          tier: "Plus",
          amount: "Apple IAP",
        });
        await sendEmail(user.email, subject, html);
        await logAudit(userId, "SUBSCRIPTION_CHANGE", { action: "subscribe", tier: "PLUS", source: "APPLE" });
        notifyAdmins(
          "New Plus subscription (Apple)",
          `<h2>New Plus Subscription (Apple IAP)</h2><p><strong>User:</strong> ${user.name ?? "Unknown"} (${user.email})</p><p><strong>Product:</strong> ${productId}</p><p><strong>Time:</strong> ${new Date().toISOString()}</p>`
        );
        sendPushToUser(userId, {
          title: "Welcome to Plus!",
          body: "Your Bonistock Plus subscription is now active. Enjoy full access!",
        }).catch(() => {});
      } else if (passConfig) {
        // Non-renewing purchase (day pass)
        await db.passPurchase.create({
          data: {
            userId,
            passType: passConfig.type,
            activationsTotal: passConfig.count,
            activationsUsed: 0,
            appleTransactionId: transactionId ?? null,
            paymentSource: "APPLE",
          },
        });

        const passNames = { ONE_DAY: "1-Day Pass", THREE_DAY: "3-Day Pass", TWELVE_DAY: "12-Day Pass" };
        const { subject, html } = await renderTemplate("passConfirmation", {
          userName: user.name ?? "there",
          passType: passNames[passConfig.type],
          activations: String(passConfig.count),
        });
        await sendEmail(user.email, subject, html);
        await logAudit(userId, "PASS_PURCHASE", { passType: passConfig.type, activations: passConfig.count, source: "APPLE" });
        notifyAdmins(
          `Day Pass purchased (Apple): ${passNames[passConfig.type]}`,
          `<h2>Day Pass Purchased (Apple IAP)</h2><p><strong>User:</strong> ${user.name ?? "Unknown"} (${user.email})</p><p><strong>Pass:</strong> ${passNames[passConfig.type]} (${passConfig.count} activations)</p><p><strong>Time:</strong> ${new Date().toISOString()}</p>`
        );
        sendPushToUser(userId, {
          title: "Pass Activated!",
          body: `Your ${passNames[passConfig.type]} is ready. Enjoy full access!`,
        }).catch(() => {});
      }
      break;
    }

    case "RENEWAL": {
      if (isSubscription) {
        const expirationDate = event.expiration_at_ms
          ? new Date(event.expiration_at_ms as number)
          : undefined;
        const purchaseDate = event.purchase_date_ms
          ? new Date(event.purchase_date_ms as number)
          : new Date();

        await db.subscription.updateMany({
          where: { userId, paymentSource: "APPLE" },
          data: {
            status: "ACTIVE",
            currentPeriodStart: purchaseDate,
            currentPeriodEnd: expirationDate ?? undefined,
            cancelAtPeriodEnd: false,
          },
        });
        log.info("revenuecat/webhook", `Subscription renewed for user ${userId}`);
      }
      break;
    }

    case "CANCELLATION": {
      await db.subscription.updateMany({
        where: { userId, paymentSource: "APPLE" },
        data: { cancelAtPeriodEnd: true },
      });
      await logAudit(userId, "SUBSCRIPTION_CHANGE", { action: "cancel_at_period_end", source: "APPLE" });
      log.info("revenuecat/webhook", `Subscription cancellation scheduled for user ${userId}`);
      break;
    }

    case "EXPIRATION": {
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
      notifyAdmins(
        "Subscription expired (Apple)",
        `<h2>Subscription Expired (Apple)</h2><p><strong>User:</strong> ${user.name ?? "Unknown"} (${user.email})</p><p><strong>Time:</strong> ${new Date().toISOString()}</p>`
      );
      break;
    }

    case "NON_RENEWING_PURCHASE": {
      if (passConfig) {
        await db.passPurchase.create({
          data: {
            userId,
            passType: passConfig.type,
            activationsTotal: passConfig.count,
            activationsUsed: 0,
            appleTransactionId: transactionId ?? null,
            paymentSource: "APPLE",
          },
        });

        const passNames = { ONE_DAY: "1-Day Pass", THREE_DAY: "3-Day Pass", TWELVE_DAY: "12-Day Pass" };
        await logAudit(userId, "PASS_PURCHASE", { passType: passConfig.type, activations: passConfig.count, source: "APPLE" });
        notifyAdmins(
          `Day Pass purchased (Apple): ${passNames[passConfig.type]}`,
          `<h2>Day Pass Purchased (Apple IAP)</h2><p><strong>User:</strong> ${user.name ?? "Unknown"} (${user.email})</p><p><strong>Pass:</strong> ${passNames[passConfig.type]}</p>`
        );
        sendPushToUser(userId, {
          title: "Pass Activated!",
          body: `Your ${passNames[passConfig.type]} is ready. Enjoy full access!`,
        }).catch(() => {});
      }
      break;
    }

    case "BILLING_ISSUE": {
      await db.subscription.updateMany({
        where: { userId, paymentSource: "APPLE" },
        data: { status: "PAST_DUE" },
      });
      log.info("revenuecat/webhook", `Billing issue for user ${userId}`);
      break;
    }

    default:
      log.info("revenuecat/webhook", `Unhandled event type: ${eventType}`);
  }

  return NextResponse.json({ received: true });
}
