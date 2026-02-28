import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

/**
 * GET /api/stripe/session?id=cs_xxx
 * Returns checkout session amount/currency for client-side conversion tracking.
 * Only returns data for sessions belonging to the authenticated user.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("id");
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  try {
    const cs = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify session belongs to this user
    if (cs.metadata?.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      amount: (cs.amount_total ?? 0) / 100,
      currency: cs.currency?.toUpperCase() ?? "EUR",
      mode: cs.mode,
      sessionId: cs.id,
    });
  } catch {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
}
