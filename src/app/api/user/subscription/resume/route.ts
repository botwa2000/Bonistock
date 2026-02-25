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

  if (!subscription.cancelAtPeriodEnd) {
    return NextResponse.json(
      { error: "Subscription is not set to cancel" },
      { status: 400 }
    );
  }

  try {
    await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: false }
    );

    await db.subscription.update({
      where: { userId: session.user.id },
      data: { cancelAtPeriodEnd: false },
    });

    await logAudit(session.user.id, "SUBSCRIPTION_CHANGE", {
      action: "resume_subscription",
      stripeSubscriptionId: subscription.stripeSubscriptionId,
    });

    log.info("subscription:resume", `User ${session.user.id} resumed subscription`);

    return NextResponse.json({
      cancelAtPeriodEnd: false,
    });
  } catch (err) {
    log.error("subscription:resume", "Failed to resume subscription", err);
    return NextResponse.json(
      { error: "Failed to resume subscription" },
      { status: 500 }
    );
  }
}
