import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomCode(len: number): string {
  return Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

async function generateUniqueCodes(count: number, prefix = ""): Promise<string[]> {
  const suffixLen = Math.max(4, 8 - prefix.length);
  const result = new Set<string>();
  for (let attempt = 0; attempt < 20 && result.size < count; attempt++) {
    const needed = count - result.size;
    const candidates = Array.from({ length: needed * 3 }, () => prefix + randomCode(suffixLen));
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

const BulkCreateSchema = z.object({
  count: z.number().int().min(1).max(500),
  discountType: z.enum(["PERCENT", "FREE_PASS", "FIXED_AMOUNT"]),
  discountPct: z.number().min(0).max(100).optional(),
  discountFixed: z.number().int().positive().optional(),
  passDays: z.number().int().positive().optional(),
  passType: z.string().optional(),
  description: z.string().max(500).optional(),
  validUntil: z.string().datetime().optional(),
  maxUses: z.number().int().min(1).default(1),
  prefix: z
    .string()
    .max(8)
    .regex(/^[A-Z0-9]*$/, "Prefix must be uppercase alphanumeric")
    .optional(),
});

export const POST = adminRoute(async (req: NextRequest, context) => {
  const raw = await req.json().catch(() => ({}));
  const parsed = BulkCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  if (data.discountType === "PERCENT" && data.discountPct == null) {
    return NextResponse.json({ error: "discountPct is required for PERCENT discount" }, { status: 400 });
  }
  if (data.discountType === "FIXED_AMOUNT" && data.discountFixed == null) {
    return NextResponse.json({ error: "discountFixed is required for FIXED_AMOUNT discount" }, { status: 400 });
  }
  if (data.discountType === "FREE_PASS" && !data.passDays) {
    return NextResponse.json({ error: "passDays is required for FREE_PASS" }, { status: 400 });
  }

  const codes = await generateUniqueCodes(data.count, data.prefix ?? "");

  // One Stripe coupon shared across all vouchers in this batch
  let stripeCouponId: string | null = null;
  if (data.discountType === "PERCENT" && data.discountPct != null) {
    try {
      const coupon = await stripe.coupons.create({
        percent_off: data.discountPct,
        duration: "once",
        name: `Admin bulk ${data.description ?? ""} ×${data.count}`.trim(),
      });
      stripeCouponId = coupon.id;
    } catch (err) {
      console.error("Stripe coupon creation failed:", err);
    }
  } else if (data.discountType === "FIXED_AMOUNT" && data.discountFixed != null) {
    try {
      const coupon = await stripe.coupons.create({
        amount_off: data.discountFixed,
        currency: "usd",
        duration: "once",
        name: `Admin bulk ${data.description ?? ""} ×${data.count}`.trim(),
      });
      stripeCouponId = coupon.id;
    } catch (err) {
      console.error("Stripe coupon creation failed:", err);
    }
  }

  await db.voucher.createMany({
    data: codes.map((code) => ({
      code,
      type: "ADMIN_PUBLIC" as const,
      discountType: data.discountType,
      discountPct: data.discountPct ?? null,
      discountFixed: data.discountFixed ?? null,
      passDays: data.passDays ?? null,
      passType: (data.passType as import("@prisma/client").PassType) ?? null,
      description: data.description ?? null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      maxUses: data.maxUses,
      useCount: 0,
      active: true,
      stripeCouponId,
      createdByUserId: context.userId,
    })),
  });

  return NextResponse.json(
    {
      codes,
      count: data.count,
      discountType: data.discountType,
      discountPct: data.discountPct ?? null,
      discountFixed: data.discountFixed ?? null,
      passDays: data.passDays ?? null,
    },
    { status: 201 }
  );
});
