import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const range = req.nextUrl.searchParams.get("range") ?? "3m";
  const days = RANGE_DAYS[range] ?? 90;

  const portfolio = await db.userPortfolio.findFirst({
    where: { id, userId: session.user.id },
    include: { holdings: true },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found", code: "NOT_FOUND" }, { status: 404 });
  }

  if (portfolio.holdings.length === 0) {
    return NextResponse.json({ dates: [], portfolioValues: [], summary: null });
  }

  const stockHoldings = portfolio.holdings.filter(
    (h) => h.assetType === "STOCK"
  );

  if (stockHoldings.length === 0) {
    return NextResponse.json({ dates: [], portfolioValues: [], summary: null });
  }

  const symbols = stockHoldings.map((h) => h.symbol);
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  // Fetch StockSnapshot history for the range
  const snaps = await db.stockSnapshot.findMany({
    where: { symbol: { in: symbols }, date: { gte: since } },
    select: { symbol: true, price: true, date: true },
    orderBy: { date: "asc" },
  });

  if (snaps.length === 0) {
    return NextResponse.json({ dates: [], portfolioValues: [], summary: null });
  }

  // Group by date
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
        // (weight / 100) * returnPct gives proportional contribution;
        // uncovered holdings contribute 0 (price assumed unchanged)
        weightedReturn += (h.weight / 100) * ((cur / base - 1) * 100);
      }
    }
    portfolioValues.push(parseFloat((100 + weightedReturn).toFixed(4)));
  }

  const rangeReturn = parseFloat((portfolioValues[portfolioValues.length - 1] - 100).toFixed(2));

  // Analyst stats
  const stocks = await db.stock.findMany({
    where: { symbol: { in: symbols } },
    select: { symbol: true, upside: true, buys: true, holds: true, sells: true },
  });
  const stockMap = new Map(stocks.map((s) => [s.symbol, s]));

  let weightedUpside = 0;
  let weightedBuyPct = 0;
  let totalWeight = 0;

  for (const h of stockHoldings) {
    const s = stockMap.get(h.symbol);
    if (!s) continue;
    const totalAnalysts = s.buys + s.holds + s.sells;
    const buyPct = totalAnalysts > 0 ? (s.buys / totalAnalysts) * 100 : 0;
    weightedUpside += h.weight * s.upside;
    weightedBuyPct += h.weight * buyPct;
    totalWeight += h.weight;
  }

  if (totalWeight > 0) {
    weightedUpside /= totalWeight;
    weightedBuyPct /= totalWeight;
  }

  const summary = {
    rangeReturn,
    weightedUpside: parseFloat(weightedUpside.toFixed(1)),
    weightedBuyPct: parseFloat(weightedBuyPct.toFixed(1)),
    holdingsCount: portfolio.holdings.length,
    totalWeight: parseFloat(portfolio.holdings.reduce((s, h) => s + h.weight, 0).toFixed(1)),
  };

  return NextResponse.json({ dates, portfolioValues, summary });
}
