import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
  "3y": 1095,
  "5y": 1825,
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

  type Holding = { symbol: string; weight: number; assetType: string };
  const holdings = (portfolio.holdings as Holding[]) ?? [];
  const stockHoldings = holdings.filter((h) => h.assetType === "STOCK" || !h.assetType);

  if (stockHoldings.length === 0) {
    return NextResponse.json({ dates: [], portfolioValues: [], summary: null });
  }

  const symbols = stockHoldings.map((h) => h.symbol);
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  // Compute returns directly from StockSnapshot price history.
  // This bypasses DemoPortfolioSnapshot (which can have stale totalValue=100 rows)
  // and stays consistent with the user portfolio performance API.
  const snaps = await db.stockSnapshot.findMany({
    where: { symbol: { in: symbols }, date: { gte: since } },
    select: { symbol: true, price: true, date: true },
    orderBy: { date: "asc" },
  });

  if (snaps.length === 0) {
    return NextResponse.json({ dates: [], portfolioValues: [], summary: null });
  }

  const byDate = new Map<string, Map<string, number>>();
  for (const s of snaps) {
    const key = s.date.toISOString().split("T")[0];
    if (!byDate.has(key)) byDate.set(key, new Map());
    byDate.get(key)!.set(s.symbol, s.price);
  }

  const dates = [...byDate.keys()].sort();
  if (dates.length < 2) {
    return NextResponse.json({ dates: [], portfolioValues: [], summary: null });
  }

  const basePrices = byDate.get(dates[0])!;
  const portfolioValues: number[] = [];

  for (const dateStr of dates) {
    const dayPrices = byDate.get(dateStr)!;
    let weightedReturn = 0;
    for (const h of stockHoldings) {
      const base = basePrices.get(h.symbol);
      const cur = dayPrices.get(h.symbol);
      if (base && cur && base > 0) {
        // Uncovered holdings contribute 0 (price assumed unchanged)
        weightedReturn += (h.weight / 100) * ((cur / base - 1) * 100);
      }
    }
    portfolioValues.push(parseFloat((100 + weightedReturn).toFixed(4)));
  }

  const rangeReturn = parseFloat((portfolioValues[portfolioValues.length - 1] - 100).toFixed(2));

  // Analyst stats from current Stock data
  let weightedUpside = 0;
  let weightedBuyPct = 0;
  let winCount = 0;
  let totalWeight = 0;

  const stocks = await db.stock.findMany({
    where: { symbol: { in: symbols } },
    select: { symbol: true, upside: true, buys: true, holds: true, sells: true },
  });
  const stockMap = new Map(stocks.map((s) => [s.symbol, s]));

  for (const h of stockHoldings) {
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

  const summary = {
    rangeReturn,
    totalReturnPct: rangeReturn,
    weightedUpside: parseFloat(weightedUpside.toFixed(1)),
    weightedBuyPct: parseFloat(weightedBuyPct.toFixed(1)),
    winRate: stockHoldings.length > 0 ? Math.round((winCount / stockHoldings.length) * 100) : 0,
    holdingsCount: holdings.length,
  };

  return NextResponse.json({ dates, portfolioValues, summary });
}
