import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { renderTemplate } from "@/lib/email-renderer";
import { notifyAdmins } from "@/lib/admin-notify";
import { log } from "@/lib/logger";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const userId = session.user.id;

  // Capture original user data BEFORE anonymization
  const originalUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      subscription: {
        select: {
          stripeSubscriptionId: true,
          stripeCustomerId: true,
          status: true,
          tier: true,
          paymentSource: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  if (!originalUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const hadActiveSubscription =
    originalUser.subscription &&
    (originalUser.subscription.status === "ACTIVE" || originalUser.subscription.status === "TRIALING") &&
    originalUser.subscription.tier === "PLUS";

  // ── 1. Cancel Stripe subscription immediately ──
  if (originalUser.subscription?.stripeSubscriptionId && originalUser.subscription.paymentSource === "STRIPE") {
    try {
      await stripe.subscriptions.cancel(originalUser.subscription.stripeSubscriptionId);
      log.info("user:delete", `Canceled Stripe subscription ${originalUser.subscription.stripeSubscriptionId} for user ${userId}`);
    } catch (err) {
      // Log but don't block deletion — subscription may already be canceled
      log.warn("user:delete", `Failed to cancel Stripe subscription: ${err}`);
    }
  }

  // ── 2. Soft delete: anonymize PII, mark as deleted ──
  await db.user.update({
    where: { id: userId },
    data: {
      email: `deleted-${userId}@deleted.bonistock.com`,
      name: "Deleted User",
      passwordHash: null,
      twoFactorSecret: null,
      twoFactorEnabled: false,
      image: null,
      deletedAt: new Date(),
    },
  });

  // ── 3. Delete OAuth links (prevents re-login reviving the deleted account) ──
  await db.account.deleteMany({ where: { userId } });

  // ── 4. Delete subscription & pass records ──
  // PassActivation has cascade on PassPurchase, so deleting PassPurchase cascades.
  await db.passPurchase.deleteMany({ where: { userId } });
  await db.subscription.deleteMany({ where: { userId } });

  // ── 5. Delete sessions, user data, push tokens ──
  await db.session.deleteMany({ where: { userId } });
  await db.authenticator.deleteMany({ where: { userId } });
  await db.watchlistItem.deleteMany({ where: { userId } });
  await db.alert.deleteMany({ where: { userId } });
  await db.savedMix.deleteMany({ where: { userId } });
  await db.userPortfolio.deleteMany({ where: { userId } });
  await db.pushToken.deleteMany({ where: { userId } });

  // ── 6. Audit ──
  await logAudit(userId, "ACCOUNT_DELETE", {
    hadSubscription: !!hadActiveSubscription,
    paymentSource: originalUser.subscription?.paymentSource ?? null,
  });

  // ── 7. Send emails ──
  if (originalUser.email) {
    try {
      if (hadActiveSubscription) {
        const { subject, html } = await renderTemplate("accountDeletionWithSubscription", {
          userName: originalUser.name ?? "there",
          tier: originalUser.subscription!.tier,
          paymentSource: originalUser.subscription!.paymentSource,
        });
        await sendEmail(originalUser.email, subject, html);
      } else {
        const { subject, html } = await renderTemplate("accountDeletion", {
          userName: originalUser.name ?? "there",
        });
        await sendEmail(originalUser.email, subject, html);
      }
    } catch {
      // Non-critical — don't block deletion
    }
  }

  // ── 8. Notify admins ──
  try {
    const subInfo = hadActiveSubscription
      ? ` (had active ${originalUser.subscription!.tier} subscription via ${originalUser.subscription!.paymentSource})`
      : "";
    await notifyAdmins(
      `Account deleted: ${originalUser.name} (${originalUser.email})`,
      `<h2>Account Deleted</h2>
       <p><strong>Name:</strong> ${originalUser.name ?? "—"}</p>
       <p><strong>Email:</strong> ${originalUser.email}</p>
       <p><strong>Subscription:</strong> ${hadActiveSubscription ? `${originalUser.subscription!.tier} via ${originalUser.subscription!.paymentSource} — canceled` : "None"}</p>
       <p><strong>Time:</strong> ${new Date().toISOString()}</p>
       <p style="color: #a3a3a3; font-size: 12px;">Soft-deleted record will be purged after 30 days.</p>`,
    );
  } catch {
    // Non-critical
  }

  return NextResponse.json({ deleted: true });
}
