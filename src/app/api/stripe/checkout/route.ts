import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/stripe";
import { getLocalePrefix } from "@/lib/locale-path";
import { log } from "@/lib/logger";

const schema = z.object({
  priceId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  log.info("stripe/checkout", "POST — creating subscription checkout");

  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    log.debug("stripe/checkout", "Unauthorized");
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    log.warn("stripe/checkout", "Validation failed", parsed.error.issues);
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  log.info("stripe/checkout", `User ${session.user.id} → priceId=${parsed.data.priceId}`);

  try {
    const locale = await getLocalePrefix();
    const url = await createCheckoutSession(
      session.user.id,
      session.user.email,
      parsed.data.priceId,
      locale
    );
    log.info("stripe/checkout", `Checkout URL created for user ${session.user.id}`);
    return NextResponse.json({ url });
  } catch (err) {
    log.error("stripe/checkout", "Failed to create checkout session:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
