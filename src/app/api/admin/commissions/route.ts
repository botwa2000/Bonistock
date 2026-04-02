import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

const PAGE_SIZE = 50;

const settleSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const GET = adminRoute(async (req: NextRequest) => {
  const url = req.nextUrl;
  const statusParam = url.searchParams.get("status");
  const promoterIdParam = url.searchParams.get("promoterId");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));

  const where: Record<string, unknown> = {};
  if (statusParam) where.status = statusParam;
  if (promoterIdParam) where.promoterId = promoterIdParam;

  const [commissions, total] = await Promise.all([
    db.promoterCommission.findMany({
      where,
      include: {
        promoter: {
          include: { user: { select: { email: true } } },
        },
        user: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.promoterCommission.count({ where }),
  ]);

  return NextResponse.json({
    commissions: commissions.map((c) => ({
      id: c.id,
      promoterId: c.promoterId,
      promoterEmail: c.promoter.user.email,
      referredUserId: c.userId,
      referredUserEmail: c.user?.email ?? null,
      amount: c.amount,
      currency: c.currency,
      pct: c.pct,
      status: c.status,
      createdAt: c.createdAt,
      settledAt: c.settledAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
});

export const PATCH = adminRoute(async (req: NextRequest) => {
  const raw = await req.json();
  const parsed = settleSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { ids } = parsed.data;
  const now = new Date();

  const pendingCommissions = await db.promoterCommission.findMany({
    where: { id: { in: ids }, status: "PENDING" },
    select: { id: true, promoterId: true, amount: true },
  });

  if (pendingCommissions.length === 0) {
    return NextResponse.json(
      { error: "No pending commissions found for the given IDs" },
      { status: 400 }
    );
  }

  // Group amounts by promoter
  const promoterAmounts = new Map<string, number>();
  for (const c of pendingCommissions) {
    const current = promoterAmounts.get(c.promoterId) ?? 0;
    promoterAmounts.set(c.promoterId, current + c.amount);
  }

  const settledIds = pendingCommissions.map((c) => c.id);

  await db.$transaction(async (tx) => {
    await tx.promoterCommission.updateMany({
      where: { id: { in: settledIds } },
      data: { status: "SETTLED", settledAt: now },
    });

    for (const [promoterId, amount] of promoterAmounts.entries()) {
      await tx.promoter.update({
        where: { id: promoterId },
        data: {
          pendingEarnings: { decrement: amount },
          totalEarnings: { increment: amount },
        },
      });
    }
  });

  return NextResponse.json({ settled: settledIds.length, ids: settledIds });
});
