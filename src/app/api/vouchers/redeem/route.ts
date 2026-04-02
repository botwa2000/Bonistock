import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

const PASS_ACTIVATIONS: Record<string, { type: "ONE_DAY" | "THREE_DAY" | "TWELVE_DAY"; count: number }> = {
  ONE_DAY: { type: "ONE_DAY", count: 1 },
  THREE_DAY: { type: "THREE_DAY", count: 3 },
  TWELVE_DAY: { type: "TWELVE_DAY", count: 12 },
};

const BodySchema = z.object({
  code: z.string().min(1),
  stripeSessionId: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
});

export const POST = authenticatedRoute(async (req: NextRequest, { userId }) => {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { stripeSessionId, stripePaymentIntentId, stripeSubscriptionId } = parsed.data;
  const code = parsed.data.code.toUpperCase();

  const voucher = await db.voucher.findUnique({ where: { code } });

  if (!voucher || !voucher.active) {
    return NextResponse.json({ error: "Invalid or inactive voucher code" }, { status: 404 });
  }

  const now = new Date();

  if (voucher.validUntil && voucher.validUntil < now) {
    return NextResponse.json({ error: "Voucher has expired" }, { status: 410 });
  }

  if (voucher.validFrom > now) {
    return NextResponse.json({ error: "Voucher is not yet valid" }, { status: 400 });
  }

  if (voucher.maxUses !== null && voucher.useCount >= voucher.maxUses) {
    return NextResponse.json({ error: "Voucher has reached maximum uses" }, { status: 410 });
  }

  if (voucher.targetUserId && voucher.targetUserId !== userId) {
    return NextResponse.json({ error: "Voucher not valid for this account" }, { status: 403 });
  }

  const alreadyRedeemed = await db.voucherRedemption.findUnique({
    where: { voucherId_userId: { voucherId: voucher.id, userId } },
  });
  if (alreadyRedeemed) {
    return NextResponse.json({ error: "Already redeemed" }, { status: 409 });
  }

  const newUseCount = voucher.useCount + 1;
  const nowExhausted = voucher.maxUses !== null && newUseCount >= voucher.maxUses;

  await db.$transaction(async (tx) => {
    await tx.voucherRedemption.create({
      data: {
        voucherId: voucher.id,
        userId,
        ...(stripeSessionId ? { stripeSessionId } : {}),
        ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
        ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
      },
    });

    await tx.voucher.update({
      where: { id: voucher.id },
      data: {
        useCount: { increment: 1 },
        ...(nowExhausted ? { active: false } : {}),
      },
    });

    if (voucher.promoterId) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { referredByPromoterId: true },
      });
      if (!user?.referredByPromoterId) {
        await tx.user.update({
          where: { id: userId },
          data: { referredByPromoterId: voucher.promoterId },
        });
      }
    }

    if (voucher.discountType === "FREE_PASS" && voucher.passType) {
      const passConfig = PASS_ACTIVATIONS[voucher.passType];
      if (passConfig) {
        await tx.passPurchase.create({
          data: {
            userId,
            passType: passConfig.type,
            activationsTotal: passConfig.count,
            activationsUsed: 0,
            paymentSource: "ADMIN",
          },
        });
      }
    }
  });

  const response: Record<string, unknown> = {
    success: true,
    discountType: voucher.discountType,
    discountPct: voucher.discountPct,
    discountFixed: voucher.discountFixed,
    passDays: voucher.passDays,
    passType: voucher.passType,
  };

  if (voucher.discountType === "FREE_PASS") {
    response.passActivated = true;
  }

  return NextResponse.json(response);
});
