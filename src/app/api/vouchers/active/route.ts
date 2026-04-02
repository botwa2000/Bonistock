import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const now = new Date();

  const voucher = await db.voucher.findFirst({
    where: {
      type: "ADMIN_PUBLIC",
      active: true,
      validFrom: { lte: now },
      OR: [{ validUntil: null }, { validUntil: { gte: now } }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!voucher) return NextResponse.json(null);

  // Exclude exhausted vouchers
  if (voucher.maxUses !== null && voucher.useCount >= voucher.maxUses) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    code: voucher.code,
    discountType: voucher.discountType,
    discountPct: voucher.discountPct ? Number(voucher.discountPct) : null,
    discountFixed: voucher.discountFixed ? Number(voucher.discountFixed) : null,
    passDays: voucher.passDays,
    description: voucher.description,
    validUntil: voucher.validUntil,
    maxUses: voucher.maxUses,
    useCount: voucher.useCount,
  });
}
