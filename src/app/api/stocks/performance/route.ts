import { NextRequest, NextResponse } from "next/server";
import { authenticatedRoute } from "@/lib/api-utils";
import { getUserTier } from "@/lib/tier";
import { db } from "@/lib/db";

export const GET = authenticatedRoute(async (req: NextRequest, { userId }) => {
  const tier = await getUserTier(userId);
  if (tier === "free") {
    return NextResponse.json(
      { error: "Performance tracking requires Plus or Pass", code: "TIER_REQUIRED" },
      { status: 401 },
    );
  }

  // Get all current stocks
  const stocks = await db.stock.findMany({
    select: { symbol: true, name: true, price: true, sector: true, risk: true },
  });

  // Get the earliest snapshot for each stock (entry price)
  const earliestSnapshots = await db.stockSnapshot.findMany({
    where: { symbol: { in: stocks.map((s) => s.symbol) } },
    orderBy: [{ symbol: "asc" }, { date: "asc" }],
    distinct: ["symbol"],
    select: { symbol: true, price: true, date: true },
  });

  const entryMap = new Map(earliestSnapshots.map((s) => [s.symbol, s]));

  // Build performance for each stock
  const picks = stocks
    .map((stock) => {
      const entry = entryMap.get(stock.symbol);
      if (!entry) return null;
      const entryPrice = entry.price;
      const currentPrice = stock.price;
      const returnPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
      return {
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        risk: stock.risk.toLowerCase(),
        entryPrice,
        currentPrice,
        entryDate: entry.date.toISOString().split("T")[0],
        returnPct: Math.round(returnPct * 100) / 100,
      };
    })
    .filter(Boolean) as {
      symbol: string;
      name: string;
      sector: string;
      risk: string;
      entryPrice: number;
      currentPrice: number;
      entryDate: string;
      returnPct: number;
    }[];

  picks.sort((a, b) => b.returnPct - a.returnPct);

  const winners = picks.filter((p) => p.returnPct > 0).length;
  const avgReturn = picks.length > 0 ? picks.reduce((s, p) => s + p.returnPct, 0) / picks.length : 0;

  // Personal watchlist performance
  const watchlistItems = await db.watchlistItem.findMany({
    where: { userId },
    select: { symbol: true, addedAt: true },
  });

  const watchlistPerformance = await Promise.all(
    watchlistItems.map(async (item) => {
      // Find snapshot closest to when user added the stock
      const entrySnap = await db.stockSnapshot.findFirst({
        where: { symbol: item.symbol, date: { lte: item.addedAt } },
        orderBy: { date: "desc" },
        select: { price: true, date: true },
      });
      // Fallback: first snapshot ever
      const snap = entrySnap ?? await db.stockSnapshot.findFirst({
        where: { symbol: item.symbol },
        orderBy: { date: "asc" },
        select: { price: true, date: true },
      });

      const stock = stocks.find((s) => s.symbol === item.symbol);
      if (!snap || !stock) return null;

      const returnPct = snap.price > 0 ? ((stock.price - snap.price) / snap.price) * 100 : 0;
      return {
        symbol: item.symbol,
        name: stock.name,
        entryPrice: snap.price,
        currentPrice: stock.price,
        addedAt: item.addedAt.toISOString().split("T")[0],
        returnPct: Math.round(returnPct * 100) / 100,
      };
    }),
  );

  const watchlist = watchlistPerformance.filter(Boolean);

  return NextResponse.json({
    picks,
    summary: {
      total: picks.length,
      winners,
      winRate: picks.length > 0 ? Math.round((winners / picks.length) * 100) : 0,
      avgReturn: Math.round(avgReturn * 100) / 100,
    },
    watchlist,
  });
});
