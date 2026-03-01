import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createPassCheckoutSession } from "@/lib/stripe";
import { getLocalePrefix } from "@/lib/locale-path";
import { log } from "@/lib/logger";

const schema = z.object({
  priceId: z.string().min(1),
  passType: z.enum(["ONE_DAY", "THREE_DAY", "TWELVE_DAY"]),
});

export async function POST(req: NextRequest) {
  log.info("stripe/pass", "POST — creating pass checkout");

  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    log.debug("stripe/pass", "Unauthorized");
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    log.warn("stripe/pass", "Validation failed", parsed.error.issues);
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  log.info("stripe/pass", `User ${session.user.id} → passType=${parsed.data.passType} priceId=${parsed.data.priceId}`);

  try {
    const locale = await getLocalePrefix();
    const url = await createPassCheckoutSession(
      session.user.id,
      session.user.email,
      parsed.data.priceId,
      parsed.data.passType,
      locale
    );
    log.info("stripe/pass", `Pass checkout URL created for user ${session.user.id}`);
    return NextResponse.json({ url });
  } catch (err) {
    log.error("stripe/pass", "Failed to create pass checkout:", err);
    return NextResponse.json({ error: "Failed to create pass checkout session" }, { status: 500 });
  }
}
