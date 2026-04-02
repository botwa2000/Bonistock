import { NextRequest, NextResponse } from "next/server";
import { authenticatedRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

export const GET = authenticatedRoute(async (_req: NextRequest, { userId }) => {
  const promoter = await db.promoter.findUnique({ where: { userId } });
  if (!promoter) {
    return NextResponse.json({ error: "Not a promoter" }, { status: 403 });
  }

  const commissions = await db.promoterCommission.findMany({
    where: { promoterId: promoter.id },
    include: {
      user: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let totalEarned = 0;
  let pendingAmount = 0;
  let settledAmount = 0;

  for (const c of commissions) {
    if (c.status === "PENDING") pendingAmount += c.amount;
    else if (c.status === "SETTLED") settledAmount += c.amount;
    if (c.status !== "CANCELLED") totalEarned += c.amount;
  }

  return NextResponse.json({
    commissions: commissions.map((c) => ({
      id: c.id,
      userEmail: c.user.email,
      userName: c.user.name,
      amount: c.amount,
      currency: c.currency,
      pct: c.pct,
      status: c.status,
      createdAt: c.createdAt,
      settledAt: c.settledAt,
    })),
    totals: {
      totalEarned,
      pendingAmount,
      settledAmount,
    },
  });
});
