import { NextRequest, NextResponse } from "next/server";
import { authenticatedRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

export const GET = authenticatedRoute(async (_req: NextRequest, { userId }) => {
  const promoter = await db.promoter.findUnique({ where: { userId } });
  if (!promoter) {
    return NextResponse.json({ error: "Not a promoter" }, { status: 403 });
  }

  const referrals = await db.user.findMany({
    where: { referredByPromoterId: promoter.id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      subscription: {
        select: { tier: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Sum commission amounts per referred user
  const commissionGroups = await db.promoterCommission.groupBy({
    by: ["userId"],
    where: { promoterId: promoter.id },
    _sum: { amount: true },
  });

  const commissionMap = new Map(
    commissionGroups.map((g) => [g.userId, g._sum.amount ?? 0])
  );

  return NextResponse.json({
    referrals: referrals.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      tier: u.subscription?.tier ?? "FREE",
      subscriptionStatus: u.subscription?.status ?? null,
      joinedAt: u.createdAt,
      totalCommission: commissionMap.get(u.id) ?? 0,
    })),
  });
});
