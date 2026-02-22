import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await db.subscription.findUnique({
    where: { userId: session.user.id },
    select: {
      status: true,
      tier: true,
      stripePriceId: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  if (!subscription || (subscription.status !== "ACTIVE" && subscription.status !== "TRIALING")) {
    return NextResponse.json({ tier: "free" });
  }

  // Look up product details via stripePriceId
  let planName = "Plus";
  let planPrice = "";
  let billingInterval: string | null = null;

  if (subscription.stripePriceId) {
    const product = await db.product.findUnique({
      where: { stripePriceId: subscription.stripePriceId },
      select: { name: true, priceAmount: true, billingInterval: true },
    });

    if (product) {
      planName = product.name;
      const dollars = (product.priceAmount / 100).toFixed(2);
      planPrice = `$${dollars}`;
      billingInterval = product.billingInterval;
    }
  }

  return NextResponse.json({
    tier: "plus",
    planName,
    planPrice,
    billingInterval,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  });
}
