import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

export const POST = adminRoute(async () => {
  const portfolios = await db.demoPortfolio.findMany();
  const results: { id: string; name: string; rows: number; reason?: string }[] = [];

  type Holding = { symbol: string; weight: number; assetType: string };

  for (const portfolio of portfolios) {
    const holdings = (portfolio.holdings as Holding[]) ?? [];
    const stockHoldings = holdings.filter((h) => h.assetType === "STOCK" || !h.assetType);

    if (stockHoldings.length === 0) {
      results.push({ id: portfolio.id, name: portfolio.name, rows: 0, reason: "no stock holdings" });
      continue;
    }

    const symbols = stockHoldings.map((h) => h.symbol);

    // Fetch ALL StockSnapshot history for these symbols
    const allSnaps = await db.stockSnapshot.findMany({
      where: { symbol: { in: symbols } },
      select: { symbol: true, price: true, date: true },
      orderBy: { date: "asc" },
    });

    if (allSnaps.length < 2) {
      results.push({ id: portfolio.id, name: portfolio.name, rows: 0, reason: "insufficient StockSnapshot data" });
      continue;
    }

    // Per-symbol baseline: each symbol's earliest-ever recorded price.
    // Using per-symbol baselines means different discovery dates for different
    // symbols don't drag the portfolio toward 0% (each symbol normalised from its own start).
    const symbolBaselines = new Map<string, number>();
    for (const s of allSnaps) {
      if (!symbolBaselines.has(s.symbol)) symbolBaselines.set(s.symbol, s.price);
    }

    // Group by date
    const byDate = new Map<string, Map<string, number>>();
    for (const s of allSnaps) {
      const key = s.date.toISOString().split("T")[0];
      if (!byDate.has(key)) byDate.set(key, new Map());
      byDate.get(key)!.set(s.symbol, s.price);
    }

    const dates = [...byDate.keys()].sort();
    if (dates.length < 2) {
      results.push({ id: portfolio.id, name: portfolio.name, rows: 0, reason: "fewer than 2 distinct dates" });
      continue;
    }

    const rows: {
      demoPortfolioId: string;
      date: Date;
      totalValue: number;
      returnPct: number;
      holdings: object;
    }[] = [];

    for (const dateStr of dates) {
      const dayPrices = byDate.get(dateStr)!;
      let weightedReturn = 0;
      let coveredWeight = 0;

      for (const h of stockHoldings) {
        const base = symbolBaselines.get(h.symbol);
        const cur = dayPrices.get(h.symbol);
        if (base && cur && base > 0) {
          weightedReturn += (h.weight / 100) * ((cur / base - 1) * 100);
          coveredWeight += h.weight;
        }
      }

      // Scale to covered weight so partial symbol coverage doesn't bias toward 0.
      // Carry forward the previous returnPct if no symbols have data on this date.
      const returnPct =
        coveredWeight > 0
          ? parseFloat(((weightedReturn / coveredWeight) * 100).toFixed(4))
          : rows.length > 0
          ? rows[rows.length - 1].returnPct
          : 0;

      rows.push({
        demoPortfolioId: portfolio.id,
        date: new Date(dateStr + "T00:00:00.000Z"),
        totalValue: parseFloat((100 * (1 + returnPct / 100)).toFixed(4)),
        returnPct,
        holdings: portfolio.holdings as object,
      });
    }

    // Atomic replace: delete all old snapshots, insert rebuilt series
    await db.$transaction([
      db.demoPortfolioSnapshot.deleteMany({ where: { demoPortfolioId: portfolio.id } }),
      db.demoPortfolioSnapshot.createMany({ data: rows }),
    ]);

    results.push({ id: portfolio.id, name: portfolio.name, rows: rows.length });
  }

  return NextResponse.json({ ok: true, results });
});
