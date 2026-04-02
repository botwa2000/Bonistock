import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

const REFCODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

async function generateRefCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += REFCODE_CHARS[Math.floor(Math.random() * REFCODE_CHARS.length)];
    }
    const existing = await db.promoter.findUnique({ where: { refCode: code } });
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique refCode after 20 attempts");
}

function getUserId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").pop()!;
}

const assignSchema = z.object({
  tierId: z.string().min(1),
});

const patchSchema = z.object({
  monthlyVoucherOverride: z.number().int().min(-1).nullable().optional(),
});

export const POST = adminRoute(async (req: NextRequest) => {
  const userId = getUserId(req);
  const raw = await req.json();
  const parsed = assignSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const tier = await db.promoterTier.findUnique({ where: { id: parsed.data.tierId } });
  if (!tier) {
    return NextResponse.json({ error: "Tier not found" }, { status: 404 });
  }

  const existing = await db.promoter.findUnique({ where: { userId } });

  let promoter;
  if (existing) {
    promoter = await db.promoter.update({
      where: { userId },
      data: { tierId: parsed.data.tierId },
      include: {
        user: { select: { email: true, name: true } },
        tier: { select: { name: true, monthlyVoucherLimit: true } },
      },
    });
  } else {
    const refCode = await generateRefCode();
    promoter = await db.promoter.create({
      data: {
        userId,
        tierId: parsed.data.tierId,
        refCode,
        totalEarnings: 0,
        pendingEarnings: 0,
      },
      include: {
        user: { select: { email: true, name: true } },
        tier: { select: { name: true, monthlyVoucherLimit: true } },
      },
    });
  }

  return NextResponse.json(promoter, { status: existing ? 200 : 201 });
});

export const DELETE = adminRoute(async (req: NextRequest) => {
  const userId = getUserId(req);

  const existing = await db.promoter.findUnique({ where: { userId } });
  if (!existing) {
    return NextResponse.json({ error: "Promoter not found" }, { status: 404 });
  }

  await db.promoter.delete({ where: { userId } });
  return NextResponse.json({ success: true });
});

export const PATCH = adminRoute(async (req: NextRequest) => {
  const userId = getUserId(req);
  const raw = await req.json();
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const existing = await db.promoter.findUnique({ where: { userId } });
  if (!existing) {
    return NextResponse.json({ error: "Promoter not found" }, { status: 404 });
  }

  const promoter = await db.promoter.update({
    where: { userId },
    data: {
      ...(parsed.data.monthlyVoucherOverride !== undefined && {
        monthlyVoucherOverride: parsed.data.monthlyVoucherOverride,
      }),
    },
    include: {
      user: { select: { email: true, name: true } },
      tier: { select: { name: true, monthlyVoucherLimit: true } },
    },
  });

  return NextResponse.json(promoter);
});
