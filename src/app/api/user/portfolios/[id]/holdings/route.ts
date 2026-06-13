import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAuth } from "@/lib/api-utils";
import { db } from "@/lib/db";

const addSchema = z.object({
  symbol: z.string().min(1).max(20),
  assetType: z.enum(["STOCK", "ETF"]).default("STOCK"),
  weight: z.number().positive().max(100),
});

export async function POST(
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

  const parsed = addSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (portfolio.holdings.length >= 20) {
    return NextResponse.json({ error: "Maximum 20 holdings per portfolio", code: "LIMIT_REACHED" }, { status: 400 });
  }

  const holding = await db.userPortfolioHolding.upsert({
    where: { portfolioId_symbol: { portfolioId: id, symbol: parsed.data.symbol } },
    update: { weight: parsed.data.weight, assetType: parsed.data.assetType },
    create: {
      portfolioId: id,
      symbol: parsed.data.symbol,
      assetType: parsed.data.assetType,
      weight: parsed.data.weight,
    },
  });

  return NextResponse.json(holding, { status: 201 });
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
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const portfolio = await db.userPortfolio.findFirst({
    where: { id, userId: ctx.userId },
  });
  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found", code: "NOT_FOUND" }, { status: 404 });
  }

  await db.userPortfolioHolding.deleteMany({
    where: { portfolioId: id, symbol },
  });

  return NextResponse.json({ deleted: true });
}
