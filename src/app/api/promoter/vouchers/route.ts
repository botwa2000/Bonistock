import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateCode(len = 6): string {
  return Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

async function uniqueCode(len = 6): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateCode(len);
    const exists = await db.voucher.findUnique({ where: { code } });
    if (!exists) return code;
  }
  throw new Error("Could not generate unique code");
}

const PostBodySchema = z.object({});

export const GET = authenticatedRoute(async (_req: NextRequest, { userId }) => {
  const promoter = await db.promoter.findUnique({ where: { userId } });
  if (!promoter) {
    return NextResponse.json({ error: "Not a promoter" }, { status: 403 });
  }

  const vouchers = await db.voucher.findMany({
    where: { promoterId: promoter.id },
    include: {
      _count: { select: { redemptions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    vouchers: vouchers.map((v) => ({
      id: v.id,
      code: v.code,
      type: v.type,
      discountType: v.discountType,
      discountPct: v.discountPct,
      discountFixed: v.discountFixed,
      passDays: v.passDays,
      passType: v.passType,
      validFrom: v.validFrom,
      validUntil: v.validUntil,
      maxUses: v.maxUses,
      useCount: v.useCount,
      active: v.active,
      description: v.description,
      redemptionCount: v._count.redemptions,
      createdAt: v.createdAt,
    })),
  });
});

export const POST = authenticatedRoute(async (req: NextRequest, { userId }) => {
  const raw = await req.json().catch(() => ({}));
  const parsed = PostBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const promoter = await db.promoter.findUnique({
    where: { userId },
    include: { tier: true },
  });
  if (!promoter) {
    return NextResponse.json({ error: "Not a promoter" }, { status: 403 });
  }

  const monthlyLimit =
    promoter.monthlyVoucherOverride !== null
      ? promoter.monthlyVoucherOverride
      : promoter.tier.monthlyVoucherLimit;

  if (monthlyLimit !== -1) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usedThisMonth = await db.voucher.count({
      where: { promoterId: promoter.id, createdAt: { gte: monthStart } },
    });
    if (usedThisMonth >= monthlyLimit) {
      return NextResponse.json({ error: "Monthly voucher limit reached" }, { status: 429 });
    }
  }

  const template = promoter.tier.voucherTemplate as {
    discountType: string;
    discountPct?: number;
    discountFixed?: number;
    passDays?: number;
    passType?: string;
  };

  const code = await uniqueCode();

  let stripeCouponId: string | undefined;

  if (template.discountType === "PERCENT" && template.discountPct != null) {
    const coupon = await stripe.coupons.create({
      percent_off: template.discountPct,
      duration: "once",
      name: `Promoter ${promoter.refCode}`,
      metadata: { promoterId: promoter.id, code },
    });
    stripeCouponId = coupon.id;
  } else if (template.discountType === "FIXED_AMOUNT" && template.discountFixed != null) {
    const coupon = await stripe.coupons.create({
      amount_off: template.discountFixed,
      currency: "usd",
      duration: "once",
      name: `Promoter ${promoter.refCode}`,
      metadata: { promoterId: promoter.id, code },
    });
    stripeCouponId = coupon.id;
  }

  const voucher = await db.voucher.create({
    data: {
      code,
      type: "PROMOTER",
      discountType: template.discountType as "PERCENT" | "FREE_PASS" | "FIXED_AMOUNT",
      discountPct: template.discountPct != null ? template.discountPct : undefined,
      discountFixed: template.discountFixed != null ? template.discountFixed : undefined,
      passDays: template.passDays != null ? template.passDays : undefined,
      passType: template.passType as "ONE_DAY" | "THREE_DAY" | "TWELVE_DAY" | undefined,
      maxUses: 1,
      active: true,
      createdByUserId: userId,
      promoterId: promoter.id,
      ...(stripeCouponId ? { stripeCouponId } : {}),
    },
  });

  return NextResponse.json({ voucher }, { status: 201 });
});
