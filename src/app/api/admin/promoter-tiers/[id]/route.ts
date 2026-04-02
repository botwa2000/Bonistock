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

const updateTierSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  monthlyVoucherLimit: z.number().int().min(-1).optional(),
  recurringCommissions: z.boolean().optional(),
  voucherTemplate: voucherTemplateSchema.optional(),
  active: z.boolean().optional(),
});

function getId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").pop()!;
}

export const PUT = adminRoute(async (req: NextRequest) => {
  const id = getId(req);
  const raw = await req.json();
  const parsed = updateTierSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const existing = await db.promoterTier.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Tier not found" }, { status: 404 });
  }

  const tier = await db.promoterTier.update({
    where: { id },
    data: parsed.data,
    include: {
      _count: { select: { promoters: true } },
    },
  });

  return NextResponse.json(tier);
});

export const DELETE = adminRoute(async (req: NextRequest) => {
  const id = getId(req);

  const tier = await db.promoterTier.findUnique({
    where: { id },
    include: { _count: { select: { promoters: true } } },
  });
  if (!tier) {
    return NextResponse.json({ error: "Tier not found" }, { status: 404 });
  }
  if (tier._count.promoters > 0) {
    return NextResponse.json(
      { error: "Cannot delete tier with assigned promoters" },
      { status: 409 }
    );
  }

  await db.promoterTier.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
