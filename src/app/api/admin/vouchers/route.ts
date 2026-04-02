import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const createVoucherSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9]+$/, "Code must be uppercase alphanumeric"),
  type: z.enum(["ADMIN_PUBLIC", "ADMIN_SINGLE"]),
  discountType: z.enum(["PERCENT", "FREE_PASS", "FIXED_AMOUNT"]),
  discountPct: z.number().min(0).max(100).optional(),
  discountFixed: z.number().int().positive().optional(),
  passDays: z.number().int().positive().optional(),
  passType: z.string().optional(),
  productId: z.string().optional(),
  description: z.string().max(500).optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  maxUses: z.number().int().min(-1).optional(),
  targetUserId: z.string().optional(),
});

export const GET = adminRoute(async (req: NextRequest) => {
  const url = req.nextUrl;
  const typeParam = url.searchParams.get("type");
  const activeParam = url.searchParams.get("active");

  const where: Record<string, unknown> = {};
  if (typeParam) where.type = typeParam;
  if (activeParam !== null) where.active = activeParam === "true";

  const vouchers = await db.voucher.findMany({
    where,
    include: {
      promoter: {
        include: { user: { select: { email: true } } },
      },
      _count: { select: { redemptions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    vouchers.map((v) => ({
      id: v.id,
      code: v.code,
      type: v.type,
      discountType: v.discountType,
      discountPct: v.discountPct,
      discountFixed: v.discountFixed,
      passDays: v.passDays,
      passType: v.passType,
      productId: v.productId,
      description: v.description,
      validFrom: v.validFrom,
      validUntil: v.validUntil,
      maxUses: v.maxUses,
      useCount: v.useCount,
      active: v.active,
      promoterId: v.promoterId,
      promoterEmail: v.promoter?.user?.email ?? null,
      targetUserId: v.targetUserId,
      stripeCouponId: v.stripeCouponId,
      redemptionCount: v._count.redemptions,
      createdAt: v.createdAt,
    }))
  );
});

export const POST = adminRoute(async (req: NextRequest, context) => {
  const raw = await req.json();
  const parsed = createVoucherSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const existing = await db.voucher.findUnique({ where: { code: data.code } });
  if (existing) {
    return NextResponse.json({ error: "Voucher code already exists" }, { status: 409 });
  }

  if (data.type === "ADMIN_SINGLE" && !data.targetUserId) {
    return NextResponse.json(
      { error: "targetUserId is required for ADMIN_SINGLE vouchers" },
      { status: 400 }
    );
  }

  let stripeCouponId: string | null = null;

  if (data.discountType === "PERCENT") {
    if (!data.discountPct) {
      return NextResponse.json(
        { error: "discountPct is required for PERCENT discount" },
        { status: 400 }
      );
    }
    try {
      const coupon = await stripe.coupons.create({
        percent_off: data.discountPct,
        duration: "once",
        name: data.code,
      });
      stripeCouponId = coupon.id;
    } catch (err) {
      console.error("Stripe coupon creation failed:", err);
    }
  } else if (data.discountType === "FIXED_AMOUNT") {
    if (!data.discountFixed) {
      return NextResponse.json(
        { error: "discountFixed is required for FIXED_AMOUNT discount" },
        { status: 400 }
      );
    }
    try {
      const coupon = await stripe.coupons.create({
        amount_off: data.discountFixed,
        currency: "usd",
        duration: "once",
        name: data.code,
      });
      stripeCouponId = coupon.id;
    } catch (err) {
      console.error("Stripe coupon creation failed:", err);
    }
  }

  const voucher = await db.voucher.create({
    data: {
      code: data.code,
      type: data.type,
      discountType: data.discountType,
      discountPct: data.discountPct ?? null,
      discountFixed: data.discountFixed ?? null,
      passDays: data.passDays ?? null,
      passType: (data.passType as import("@prisma/client").PassType) ?? null,
      productId: data.productId ?? null,
      description: data.description ?? null,
      validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      maxUses: data.maxUses ?? null,
      useCount: 0,
      active: true,
      targetUserId: data.targetUserId ?? null,
      stripeCouponId,
      createdByUserId: context.userId,
    },
  });

  return NextResponse.json(voucher, { status: 201 });
});
