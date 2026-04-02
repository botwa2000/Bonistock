import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

const voucherTemplateSchema = z.object({
  discountType: z.enum(["PERCENT", "FREE_PASS", "FIXED_AMOUNT"]),
  discountPct: z.number().min(0).max(100).optional(),
  discountFixed: z.number().int().positive().optional(),
  passDays: z.number().int().positive().optional(),
  passType: z.string().optional(),
});

const createTierSchema = z.object({
  name: z.string().min(1).max(100),
  commissionPct: z.number().min(0).max(100),
  monthlyVoucherLimit: z.number().int().min(-1),
  recurringCommissions: z.boolean(),
  voucherTemplate: voucherTemplateSchema,
});

export const GET = adminRoute(async () => {
  const tiers = await db.promoterTier.findMany({
    include: {
      _count: { select: { promoters: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(tiers);
});

export const POST = adminRoute(async (req: NextRequest) => {
  const raw = await req.json();
  const parsed = createTierSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const tier = await db.promoterTier.create({
    data: {
      name: parsed.data.name,
      commissionPct: parsed.data.commissionPct,
      monthlyVoucherLimit: parsed.data.monthlyVoucherLimit,
      recurringCommissions: parsed.data.recurringCommissions,
      voucherTemplate: parsed.data.voucherTemplate,
      active: true,
    },
    include: {
      _count: { select: { promoters: true } },
    },
  });

  return NextResponse.json(tier, { status: 201 });
});
