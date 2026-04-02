import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const BodySchema = z.object({
  code: z.string().min(1),
});

export async function POST(req: NextRequest) {
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

  const code = parsed.data.code.toUpperCase();

  const voucher = await db.voucher.findUnique({ where: { code } });

  if (!voucher) {
    return NextResponse.json({ error: "Invalid voucher code" }, { status: 404 });
  }

  if (!voucher.active) {
    return NextResponse.json({ error: "Voucher is no longer active" }, { status: 410 });
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

  return NextResponse.json({
    valid: true,
    code: voucher.code,
    discountType: voucher.discountType,
    discountPct: voucher.discountPct,
    discountFixed: voucher.discountFixed,
    passDays: voucher.passDays,
    passType: voucher.passType,
    description: voucher.description,
    productId: voucher.productId,
    type: voucher.type,
  });
}
