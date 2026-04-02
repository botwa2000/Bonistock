import { NextRequest, NextResponse } from "next/server";
import { authenticatedRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

export const GET = authenticatedRoute(async (_req: NextRequest, { userId }) => {
  const promoter = await db.promoter.findUnique({
    where: { userId },
    include: { tier: true },
  });

  if (!promoter) {
    return NextResponse.json({ error: "Not a promoter" }, { status: 403 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalVouchers, usedVouchers, totalReferrals, pendingCommissions, settledCommissions, usedThisMonth] =
    await Promise.all([
      db.voucher.count({ where: { promoterId: promoter.id } }),
      db.voucher.count({ where: { promoterId: promoter.id, useCount: { gt: 0 } } }),
      db.user.count({ where: { referredByPromoterId: promoter.id } }),
      db.promoterCommission.count({ where: { promoterId: promoter.id, status: "PENDING" } }),
      db.promoterCommission.count({ where: { promoterId: promoter.id, status: "SETTLED" } }),
      db.voucher.count({
        where: { promoterId: promoter.id, createdAt: { gte: monthStart } },
      }),
    ]);

  const monthlyLimit =
    promoter.monthlyVoucherOverride !== null
      ? promoter.monthlyVoucherOverride
      : promoter.tier.monthlyVoucherLimit;

  return NextResponse.json({
    promoter: {
      id: promoter.id,
      refCode: promoter.refCode,
      tierId: promoter.tierId,
      tierName: promoter.tier.name,
      commissionPct: promoter.tier.commissionPct,
      totalEarnings: promoter.totalEarnings,
      pendingEarnings: promoter.pendingEarnings,
      monthlyLimit,
      usedThisMonth,
    },
    stats: {
      totalVouchers,
      usedVouchers,
      totalReferrals,
      pendingCommissions,
      settledCommissions,
    },
  });
});
