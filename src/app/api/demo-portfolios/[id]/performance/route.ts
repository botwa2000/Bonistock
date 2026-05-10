import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const range = req.nextUrl.searchParams.get("range") ?? "3m";
  const days = RANGE_DAYS[range] ?? 90;

  const portfolio = await db.demoPortfolio.findUnique({ where: { id } });
  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const snapshots = await db.demoPortfolioSnapshot.findMany({
    where: { demoPortfolioId: id, date: { gte: since } },
    orderBy: { date: "asc" },
    select: { date: true, returnPct: true, totalValue: true },
  });

  if (snapshots.length === 0) {
    return NextResponse.json({ dates: [], portfolioValues: [], summary: null });
  }

  // Normalize to index = 100 at start of selected range
  const baseValue = snapshots[0].totalValue;
  const dates = snapshots.map((s) => s.date.toISOString().split("T")[0]);
  const portfolioValues = snapshots.map((s) =>
    parseFloat(((s.totalValue / baseValue) * 100).toFixed(4))
  );

  const latestSnapshot = snapshots[snapshots.length - 1];
  const rangeReturn = parseFloat(
    (((latestSnapshot.totalValue - baseValue) / baseValue) * 100).toFixed(2)
  );

  // Analyst stats from current Stock data for stock holdings
  type Holding = { symbol: string; weight: number; assetType: string };
  const holdings = (portfolio.holdings as Holding[]) ?? [];
  const stockSymbols = holdings
    .filter((h) => h.assetType === "STOCK" || !h.assetType)
    .map((h) => h.symbol);

  let weightedUpside = 0;
  let weightedBuyPct = 0;
  let winCount = 0;
  let totalWeight = 0;

  if (stockSymbols.length > 0) {
    const stocks = await db.stock.findMany({
      where: { symbol: { in: stockSymbols } },
      select: { symbol: true, upside: true, buys: true, holds: true, sells: true },
    });
    const stockMap = new Map(stocks.map((s) => [s.symbol, s]));

    for (const h of holdings.filter((h) => h.assetType === "STOCK" || !h.assetType)) {
      const s = stockMap.get(h.symbol);
      if (!s) continue;
      const totalAnalysts = s.buys + s.holds + s.sells;
      const buyPct = totalAnalysts > 0 ? (s.buys / totalAnalysts) * 100 : 0;
      weightedUpside += h.weight * s.upside;
      weightedBuyPct += h.weight * buyPct;
      if (s.upside > 0) winCount++;
      totalWeight += h.weight;
    }

    if (totalWeight > 0) {
      weightedUpside /= totalWeight;
      weightedBuyPct /= totalWeight;
    }
  }

  const summary = {
    rangeReturn,
    totalReturnPct: parseFloat(latestSnapshot.returnPct.toFixed(2)),
    weightedUpside: parseFloat(weightedUpside.toFixed(1)),
    weightedBuyPct: parseFloat(weightedBuyPct.toFixed(1)),
    winRate: holdings.length > 0 ? Math.round((winCount / stockSymbols.length) * 100) : 0,
    holdingsCount: holdings.length,
  };

  return NextResponse.json({ dates, portfolioValues, summary });
}
