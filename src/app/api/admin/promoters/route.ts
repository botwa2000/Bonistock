import { NextRequest, NextResponse } from "next/server";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

export const GET = adminRoute(async (req: NextRequest) => {
  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";

  const promoters = await db.promoter.findMany({
    where: search
      ? {
          user: {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : undefined,
    include: {
      user: { select: { email: true, name: true } },
      tier: { select: { name: true, monthlyVoucherLimit: true } },
      _count: { select: { vouchers: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    promoters.map((p) => ({
      id: p.id,
      userId: p.userId,
      email: p.user.email,
      name: p.user.name,
      tierId: p.tierId,
      tierName: p.tier.name,
      refCode: p.refCode,
      voucherUseCount: p._count.vouchers,
      totalEarnings: p.totalEarnings,
      pendingEarnings: p.pendingEarnings,
      monthlyVoucherLimit:
        p.monthlyVoucherOverride !== null && p.monthlyVoucherOverride !== undefined
          ? p.monthlyVoucherOverride
          : p.tier.monthlyVoucherLimit,
      monthlyVoucherOverride: p.monthlyVoucherOverride,
      createdAt: p.createdAt,
    }))
  );
});
