import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { logAudit } from "@/lib/audit";
import { log } from "@/lib/logger";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await db.subscription.findUnique({
    where: { userId: session.user.id },
    select: {
      stripeSubscriptionId: true,
      paymentSource: true,
      status: true,
      cancelAtPeriodEnd: true,
    },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 404 }
    );
  }

  if (subscription.paymentSource === "APPLE") {
    return NextResponse.json(
      { error: "Apple subscriptions must be managed through Apple Settings" },
      { status: 400 }
    );
  }

  if (!subscription.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 404 }
    );
  }

  if (subscription.cancelAtPeriodEnd) {
    return NextResponse.json(
      { error: "Subscription is already set to cancel" },
      { status: 400 }
    );
  }

  try {
    const updated = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    await db.subscription.update({
      where: { userId: session.user.id },
      data: { cancelAtPeriodEnd: true },
    });

    await logAudit(session.user.id, "SUBSCRIPTION_CHANGE", {
      action: "cancel_at_period_end",
      stripeSubscriptionId: subscription.stripeSubscriptionId,
    });

    log.info("subscription:cancel", `User ${session.user.id} scheduled cancellation`);

    return NextResponse.json({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: (updated as any).current_period_end
        ? new Date((updated as any).current_period_end * 1000).toISOString()
        : null,
    });
  } catch (err) {
    log.error("subscription:cancel", "Failed to cancel subscription", err);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
