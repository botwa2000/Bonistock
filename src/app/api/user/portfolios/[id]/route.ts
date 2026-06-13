import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAuth } from "@/lib/api-utils";
import { db } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const portfolio = await db.userPortfolio.findFirst({
    where: { id, userId: ctx.userId },
    include: { holdings: true },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(portfolio);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const portfolio = await db.userPortfolio.updateMany({
    where: { id, userId: ctx.userId },
    data: parsed.data,
  });

  if (portfolio.count === 0) {
    return NextResponse.json({ error: "Portfolio not found", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ updated: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  await db.userPortfolio.deleteMany({
    where: { id, userId: ctx.userId },
  });

  return NextResponse.json({ deleted: true });
}
