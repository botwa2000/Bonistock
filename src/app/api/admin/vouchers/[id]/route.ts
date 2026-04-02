import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

const updateVoucherSchema = z.object({
  description: z.string().max(500).optional(),
  validUntil: z.string().datetime().nullable().optional(),
  maxUses: z.number().int().min(-1).nullable().optional(),
  active: z.boolean().optional(),
});

function getId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").pop()!;
}

export const GET = adminRoute(async (req: NextRequest) => {
  const id = getId(req);

  const voucher = await db.voucher.findUnique({
    where: { id },
    include: {
      redemptions: {
        include: { user: { select: { email: true, name: true } } },
        orderBy: { redeemedAt: "desc" },
      },
      promoter: {
        include: { user: { select: { email: true } } },
      },
    },
  });

  if (!voucher) {
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
  }

  return NextResponse.json(voucher);
});

export const PUT = adminRoute(async (req: NextRequest) => {
  const id = getId(req);
  const raw = await req.json();
  const parsed = updateVoucherSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const existing = await db.voucher.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
  }

  const data = parsed.data;
  const voucher = await db.voucher.update({
    where: { id },
    data: {
      ...(data.description !== undefined && { description: data.description }),
      ...(data.validUntil !== undefined && {
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      }),
      ...(data.maxUses !== undefined && { maxUses: data.maxUses }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });

  return NextResponse.json(voucher);
});

export const DELETE = adminRoute(async (req: NextRequest) => {
  const id = getId(req);

  const existing = await db.voucher.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
  }

  const voucher = await db.voucher.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json(voucher);
});
