import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const addSchema = z.object({
  symbol: z.string().min(1).max(10),
  shares: z.number().positive(),
  avgCost: z.number().positive(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;

  // Verify portfolio ownership
  const portfolio = await db.userPortfolio.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const parsed = addSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const holding = await db.userPortfolioHolding.upsert({
    where: { portfolioId_symbol: { portfolioId: id, symbol: parsed.data.symbol } },
    update: { shares: parsed.data.shares, avgCost: parsed.data.avgCost },
    create: {
      portfolioId: id,
      symbol: parsed.data.symbol,
      shares: parsed.data.shares,
      avgCost: parsed.data.avgCost,
    },
  });

  return NextResponse.json(holding, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  // Verify portfolio ownership
  const portfolio = await db.userPortfolio.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found", code: "NOT_FOUND" }, { status: 404 });
  }

  await db.userPortfolioHolding.deleteMany({
    where: { portfolioId: id, symbol },
  });

  return NextResponse.json({ deleted: true });
}
