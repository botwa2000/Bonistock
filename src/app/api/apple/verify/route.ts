import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { renderTemplate } from "@/lib/email-renderer";
import { notifyAdmins } from "@/lib/admin-notify";
import { sendPushToUser } from "@/lib/push";
import { getAppleApiClient, getAppleVerifier, getAppleEnvironments, Environment } from "@/lib/apple-server";

const PASS_MAP: Record<string, { type: "ONE_DAY" | "THREE_DAY" | "TWELVE_DAY"; count: number }> = {
  "com.bonifatus.bonistock.pass.1day": { type: "ONE_DAY", count: 1 },
  "com.bonifatus.bonistock.pass.3day": { type: "THREE_DAY", count: 3 },
  "com.bonifatus.bonistock.pass.12day": { type: "TWELVE_DAY", count: 12 },
};

/**
 * Fetch and verify a transaction from Apple, trying both environments.
 * TestFlight / sandbox testers use SANDBOX, real App Store uses PRODUCTION.
 */
async function fetchAndVerifyTransaction(transactionId: string) {
  const [primary, fallback] = getAppleEnvironments();

  for (const env of [primary, fallback]) {
    const envName = env === Environment.PRODUCTION ? "PRODUCTION" : "SANDBOX";
    const client = getAppleApiClient(env);
    const verifier = getAppleVerifier(env);
    if (!client || !verifier) {
      log.debug("apple/verify", `Skipping ${envName} — client or verifier not available`);
      continue;
    }

    try {
      log.debug("apple/verify", `Trying ${envName} for txn=${transactionId}`);
      const txnResponse = await client.getTransactionInfo(transactionId);
      if (!txnResponse.signedTransactionInfo) {
        log.debug("apple/verify", `No signedTransactionInfo in ${envName} response`);
        continue;
      }
      const txn = await verifier.verifyAndDecodeTransaction(txnResponse.signedTransactionInfo);
      log.info("apple/verify", `Verified txn=${transactionId} via ${envName}`);
      return txn;
    } catch (err) {
      log.debug("apple/verify", `${envName} failed for txn=${transactionId}:`, err);
      // Try the next environment
    }
  }

  return null;
}

/**
 * POST /api/apple/verify
 * Client sends { transactionId } right after a successful StoreKit 2 purchase.
 * Server verifies with Apple App Store Server API, then creates DB records.
 * Tries both production and sandbox environments to handle TestFlight + App Store.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { transactionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { transactionId } = body;
  if (!transactionId) {
    return NextResponse.json({ error: "Missing transactionId" }, { status: 400 });
  }

  log.info("apple/verify", `Verify request: txn=${transactionId}, user=${userId}`);

  // Check that at least one environment is configured
  const [primary] = getAppleEnvironments();
  if (!getAppleApiClient(primary) && !getAppleApiClient(primary === Environment.PRODUCTION ? Environment.SANDBOX : Environment.PRODUCTION)) {
    log.error("apple/verify", "Apple IAP not configured");
    return NextResponse.json({ error: "Apple IAP not configured" }, { status: 500 });
  }

  try {
    const txn = await fetchAndVerifyTransaction(transactionId);
    if (!txn) {
      log.error("apple/verify", `Transaction verification failed in both environments for txn=${transactionId}`);
      return NextResponse.json({ error: "Transaction not found or verification failed" }, { status: 404 });
    }

    const productId = txn.productId;
    const originalTransactionId = txn.originalTransactionId;

    if (!productId) {
      return NextResponse.json({ error: "Missing product info" }, { status: 400 });
    }

    log.info("apple/verify", `Verified txn=${transactionId}, product=${productId}, user=${userId}`);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isSubscription = productId.startsWith("com.bonifatus.bonistock.plus.");
    const passConfig = PASS_MAP[productId];

    if (isSubscription) {
      const expirationDate = txn.expiresDate ? new Date(txn.expiresDate) : undefined;
      const purchaseDate = txn.purchaseDate ? new Date(txn.purchaseDate) : new Date();

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
      await logAudit(userId, "SUBSCRIPTION_CHANGE", { action: "subscribe", tier: "PLUS", source: "APPLE", productId });
      await notifyAdmins(
        "New Plus subscription (Apple)",
        `<h2>New Plus Subscription (Apple IAP)</h2><p><strong>User:</strong> ${user.name ?? "Unknown"} (${user.email})</p><p><strong>Product:</strong> ${productId}</p><p><strong>Time:</strong> ${new Date().toISOString()}</p>`,
      );
      sendPushToUser(userId, {
        title: "Welcome to Plus!",
        body: "Your Bonistock Plus subscription is now active. Enjoy full access!",
      }).catch(() => {});
    } else if (passConfig) {
      await db.passPurchase.create({
        data: {
          userId,
          passType: passConfig.type,
          activationsTotal: passConfig.count,
          activationsUsed: 0,
          appleTransactionId: transactionId,
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
      await notifyAdmins(
        `Day Pass purchased (Apple): ${passNames[passConfig.type]}`,
        `<h2>Day Pass Purchased (Apple IAP)</h2><p><strong>User:</strong> ${user.name ?? "Unknown"} (${user.email})</p><p><strong>Pass:</strong> ${passNames[passConfig.type]} (${passConfig.count} activations)</p><p><strong>Time:</strong> ${new Date().toISOString()}</p>`,
      );
      sendPushToUser(userId, {
        title: "Pass Activated!",
        body: `Your ${passNames[passConfig.type]} is ready. Enjoy full access!`,
      }).catch(() => {});
    } else {
      log.warn("apple/verify", `Unknown product: ${productId}`);
      return NextResponse.json({ error: "Unknown product" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("apple/verify", `Verification failed for txn ${transactionId}:`, err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
