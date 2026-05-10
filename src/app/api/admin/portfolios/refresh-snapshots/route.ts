import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

export const POST = adminRoute(async () => {
  const portfolios = await db.demoPortfolio.findMany({
    include: {
      snapshots: { orderBy: { date: "asc" }, take: 1 },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  type Holding = { symbol: string; weight: number; assetType: string };
  const allSymbols = new Set<string>();
  for (const p of portfolios) {
    for (const h of (p.holdings as Holding[]) ?? []) {
      if (h.assetType === "STOCK" || !h.assetType) allSymbols.add(h.symbol);
    }
  }

  const todayStocks = await db.stock.findMany({
    where: { symbol: { in: [...allSymbols] } },
    select: { symbol: true, price: true },
  });
  const todayMap = new Map(todayStocks.map((s) => [s.symbol, s.price]));

  const results: { id: string; created: boolean; reason?: string }[] = [];

  for (const portfolio of portfolios) {
    const existing = await db.demoPortfolioSnapshot.findFirst({
      where: { demoPortfolioId: portfolio.id, date: today },
    });
    if (existing) {
      results.push({ id: portfolio.id, created: false, reason: "already exists" });
      continue;
    }

    const firstSnapshot = portfolio.snapshots[0];
    if (!firstSnapshot) {
      results.push({ id: portfolio.id, created: false, reason: "no baseline snapshot" });
      continue;
    }

    const holdings = (portfolio.holdings as Holding[]) ?? [];
    const stockHoldings = holdings.filter((h) => h.assetType === "STOCK" || !h.assetType);
    if (stockHoldings.length === 0) {
      results.push({ id: portfolio.id, created: false, reason: "no stock holdings" });
      continue;
    }

    const baselineDate = new Date(firstSnapshot.date);
    baselineDate.setHours(0, 0, 0, 0);
    const baselineDateEnd = new Date(baselineDate.getTime() + 24 * 60 * 60 * 1000);

    const baselineSnapshots = await db.stockSnapshot.findMany({
      where: {
        symbol: { in: stockHoldings.map((h) => h.symbol) },
        date: { gte: baselineDate, lt: baselineDateEnd },
      },
      select: { symbol: true, price: true },
    });
    const baselineMap = new Map(baselineSnapshots.map((s) => [s.symbol, s.price]));

    let weightedReturn = 0;
    let totalWeight = 0;
    for (const h of stockHoldings) {
      const base = baselineMap.get(h.symbol);
      const cur = todayMap.get(h.symbol);
      if (!base || !cur || base === 0) continue;
      weightedReturn += h.weight * ((cur / base - 1) * 100);
      totalWeight += h.weight;
    }

    if (totalWeight === 0) {
      results.push({ id: portfolio.id, created: false, reason: "no matching prices" });
      continue;
    }

    const returnPct = weightedReturn / totalWeight;
    const totalValue = 100 * (1 + returnPct / 100);

    await db.demoPortfolioSnapshot.create({
      data: {
        demoPortfolioId: portfolio.id,
        date: today,
        totalValue: Math.round(totalValue * 100) / 100,
        returnPct: Math.round(returnPct * 100) / 100,
        holdings: portfolio.holdings as object,
      },
    });

    results.push({ id: portfolio.id, created: true });
  }

  return NextResponse.json({ ok: true, results });
});
