import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCustomerPortalSession } from "@/lib/stripe";
import { getLocalePrefix } from "@/lib/locale-path";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const subscription = await db.subscription.findUnique({
    where: { userId: session.user.id },
    select: { stripeCustomerId: true },
  });

  if (!subscription) {
    return NextResponse.json({ error: "No subscription found", code: "NOT_FOUND" }, { status: 404 });
  }

  const locale = await getLocalePrefix();
  const url = await createCustomerPortalSession(subscription.stripeCustomerId, locale);
  return NextResponse.json({ url });
}
