import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const RANGE_DAYS: Record<string, number> = {
  "1w": 7,
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
    return NextResponse.json({ dates: [], portfolioValues: [], summary: null, holdingsData: [], breakdown: null });
  }

  const stockHoldings = portfolio.holdings.filter((h) => h.assetType === "STOCK");

  // Fetch enriched stock data for all stock holdings
  const symbols = stockHoldings.map((h) => h.symbol);
  const stocks = await db.stock.findMany({
    where: { symbol: { in: symbols } },
    select: {
      symbol: true,
      name: true,
      sector: true,
      region: true,
      risk: true,
      upside: true,
      buys: true,
      holds: true,
      sells: true,
      price: true,
      dividendYield: true,
      beta: true,
      pe: true,
    },
  });
  const stockMap = new Map(stocks.map((s) => [s.symbol, s]));

  // Build enriched holdings data (all holdings, ETFs get partial data)
  const holdingsData = portfolio.holdings.map((h) => {
    const s = stockMap.get(h.symbol);
    return {
      symbol: h.symbol,
      name: s?.name ?? h.symbol,
      assetType: h.assetType,
      weight: h.weight,
      sector: s?.sector ?? "ETF",
      region: s?.region ?? "unknown",
      risk: s?.risk ?? null,
      upside: s?.upside ?? null,
      buys: s?.buys ?? null,
      holds: s?.holds ?? null,
      sells: s?.sells ?? null,
      price: s?.price ?? null,
      dividendYield: s?.dividendYield ?? null,
      beta: s?.beta ?? null,
      pe: s?.pe ?? null,
    };
  });

  // Compute breakdown aggregates across all holdings (weighted)
  const sectorBreakdown: Record<string, number> = {};
  const regionBreakdown: Record<string, number> = {};
  const riskBreakdown: Record<string, number> = {};
  for (const h of holdingsData) {
    const w = h.weight;
    const sec = h.sector || "Other";
    sectorBreakdown[sec] = (sectorBreakdown[sec] ?? 0) + w;
    const reg = h.region || "Other";
    regionBreakdown[reg] = (regionBreakdown[reg] ?? 0) + w;
    if (h.risk) {
      riskBreakdown[h.risk] = (riskBreakdown[h.risk] ?? 0) + w;
    }
  }

  // If no stock holdings, return enriched metadata only (no chart data)
  if (stockHoldings.length === 0) {
    return NextResponse.json({
      dates: [],
      portfolioValues: [],
      summary: null,
      holdingsData,
      breakdown: { sector: sectorBreakdown, region: regionBreakdown, risk: riskBreakdown },
    });
  }

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
    return NextResponse.json({
      dates: [],
      portfolioValues: [],
      summary: null,
      holdingsData,
      breakdown: { sector: sectorBreakdown, region: regionBreakdown, risk: riskBreakdown },
    });
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
    return NextResponse.json({
      dates: [],
      portfolioValues: [],
      summary: null,
      holdingsData,
      breakdown: { sector: sectorBreakdown, region: regionBreakdown, risk: riskBreakdown },
    });
  }

  // Per-symbol baseline: use first date each symbol appears (handles sparse data)
  const symbolBaselines = new Map<string, number>();
  for (const dateStr of dates) {
    const dayPrices = byDate.get(dateStr)!;
    for (const h of stockHoldings) {
      if (!symbolBaselines.has(h.symbol) && dayPrices.has(h.symbol)) {
        symbolBaselines.set(h.symbol, dayPrices.get(h.symbol)!);
      }
    }
  }

  const portfolioValues: number[] = [];
  for (const dateStr of dates) {
    const dayPrices = byDate.get(dateStr)!;
    let weightedReturn = 0;
    let coveredWeight = 0;
    for (const h of stockHoldings) {
      const base = symbolBaselines.get(h.symbol);
      const cur = dayPrices.get(h.symbol);
      if (base && cur && base > 0) {
        weightedReturn += h.weight * ((cur / base - 1) * 100);
        coveredWeight += h.weight;
      }
    }
    const portfolioReturn = coveredWeight > 0 ? weightedReturn / coveredWeight : 0;
    portfolioValues.push(parseFloat((100 + portfolioReturn).toFixed(4)));
  }

  const rangeReturn = parseFloat((portfolioValues[portfolioValues.length - 1] - 100).toFixed(2));

  // Compute weighted analyst stats
  let weightedUpside = 0;
  let weightedBuyPct = 0;
  let weightedBeta = 0;
  let weightedDividendYield = 0;
  let totalWeight = 0;
  let betaWeight = 0;
  let divWeight = 0;

  for (const h of stockHoldings) {
    const s = stockMap.get(h.symbol);
    if (!s) continue;
    const totalAnalysts = s.buys + s.holds + s.sells;
    const buyPct = totalAnalysts > 0 ? (s.buys / totalAnalysts) * 100 : 0;
    weightedUpside += h.weight * s.upside;
    weightedBuyPct += h.weight * buyPct;
    totalWeight += h.weight;
    if (s.beta != null) { weightedBeta += h.weight * s.beta; betaWeight += h.weight; }
    if (s.dividendYield != null) { weightedDividendYield += h.weight * s.dividendYield; divWeight += h.weight; }
  }

  if (totalWeight > 0) {
    weightedUpside /= totalWeight;
    weightedBuyPct /= totalWeight;
  }

  const summary = {
    rangeReturn,
    weightedUpside: parseFloat(weightedUpside.toFixed(1)),
    weightedBuyPct: parseFloat(weightedBuyPct.toFixed(1)),
    weightedBeta: betaWeight > 0 ? parseFloat((weightedBeta / betaWeight).toFixed(2)) : null,
    weightedDividendYield: divWeight > 0 ? parseFloat((weightedDividendYield / divWeight).toFixed(2)) : null,
    holdingsCount: portfolio.holdings.length,
    totalWeight: parseFloat(portfolio.holdings.reduce((s, h) => s + h.weight, 0).toFixed(1)),
  };

  return NextResponse.json({
    dates,
    portfolioValues,
    summary,
    holdingsData,
    breakdown: { sector: sectorBreakdown, region: regionBreakdown, risk: riskBreakdown },
  });
}
