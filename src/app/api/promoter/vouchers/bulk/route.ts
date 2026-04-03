import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomCode(len: number): string {
  return Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

async function generateUniqueCodes(count: number): Promise<string[]> {
  const result = new Set<string>();
  for (let attempt = 0; attempt < 20 && result.size < count; attempt++) {
    const needed = count - result.size;
    const candidates = Array.from({ length: needed * 3 }, () => randomCode(6));
    const existing = await db.voucher.findMany({
      where: { code: { in: candidates } },
      select: { code: true },
    });
    const existingSet = new Set(existing.map((v) => v.code));
    for (const c of candidates) {
      if (!existingSet.has(c) && !result.has(c)) {
        result.add(c);
        if (result.size >= count) break;
      }
    }
  }
  if (result.size < count) throw new Error("Could not generate enough unique codes");
  return Array.from(result);
}

const PostSchema = z.object({
  count: z.number().int().min(1).max(50),
});

export const POST = authenticatedRoute(async (req: NextRequest, { userId }) => {
  const raw = await req.json().catch(() => ({}));
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }
  const { count } = parsed.data;

  const promoter = await db.promoter.findUnique({
    where: { userId },
    include: { tier: true },
  });
  if (!promoter) return NextResponse.json({ error: "Not a promoter" }, { status: 403 });

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
    const remaining = monthlyLimit - usedThisMonth;
    if (remaining <= 0) {
      return NextResponse.json({ error: "Monthly voucher limit reached" }, { status: 429 });
    }
    if (count > remaining) {
      return NextResponse.json(
        { error: `Only ${remaining} voucher(s) remaining this month`, remaining },
        { status: 422 }
      );
    }
  }

  const template = promoter.tier.voucherTemplate as {
    discountType: string;
    discountPct?: number;
    discountFixed?: number;
    passDays?: number;
    passType?: string;
  };

  const codes = await generateUniqueCodes(count);

  // One Stripe coupon shared across all vouchers in this batch
  let stripeCouponId: string | undefined;
  if (template.discountType === "PERCENT" && template.discountPct != null) {
    const coupon = await stripe.coupons.create({
      percent_off: template.discountPct,
      duration: "once",
      name: `Promoter ${promoter.refCode} bulk ×${count}`,
      metadata: { promoterId: promoter.id },
    });
    stripeCouponId = coupon.id;
  } else if (template.discountType === "FIXED_AMOUNT" && template.discountFixed != null) {
    const coupon = await stripe.coupons.create({
      amount_off: template.discountFixed,
      currency: "usd",
      duration: "once",
      name: `Promoter ${promoter.refCode} bulk ×${count}`,
      metadata: { promoterId: promoter.id },
    });
    stripeCouponId = coupon.id;
  }

  await db.voucher.createMany({
    data: codes.map((code) => ({
      code,
      type: "PROMOTER" as const,
      discountType: template.discountType as "PERCENT" | "FREE_PASS" | "FIXED_AMOUNT",
      discountPct: template.discountPct ?? undefined,
      discountFixed: template.discountFixed ?? undefined,
      passDays: template.passDays ?? undefined,
      passType: template.passType as "ONE_DAY" | "THREE_DAY" | "TWELVE_DAY" | undefined,
      maxUses: 1,
      active: true,
      createdByUserId: userId,
      promoterId: promoter.id,
      ...(stripeCouponId ? { stripeCouponId } : {}),
    })),
  });

  return NextResponse.json(
    {
      codes,
      count,
      discountType: template.discountType,
      discountPct: template.discountPct ?? null,
      discountFixed: template.discountFixed ?? null,
      passDays: template.passDays ?? null,
    },
    { status: 201 }
  );
});
