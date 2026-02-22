import { NextRequest, NextResponse } from "next/server";
import { authenticatedRoute } from "@/lib/api-utils";
import { getUserTier } from "@/lib/tier";
import { db } from "@/lib/db";

const DATES_PER_PAGE = 7;

export const GET = authenticatedRoute(async (req: NextRequest, { userId }) => {
  const tier = await getUserTier(userId);
  if (tier === "free") {
    return NextResponse.json(
      { error: "Pick History requires Plus or Pass", code: "TIER_REQUIRED" },
      { status: 401 }
    );
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const symbolFilter = searchParams.get("symbol") ?? null;

  // Get distinct dates (newest first)
  const allDatesRaw = await db.stockSnapshot.findMany({
    select: { date: true },
    distinct: ["date"],
    orderBy: { date: "desc" },
  });
  const allDates = allDatesRaw.map((d) => d.date);
  const totalDates = allDates.length;

  // Paginate dates
  const start = (page - 1) * DATES_PER_PAGE;
  const paginatedDates = allDates.slice(start, start + DATES_PER_PAGE);

  if (paginatedDates.length === 0) {
    return NextResponse.json({
      dates: [],
      totalDates,
      page,
      recurring: [],
    });
  }

  // Fetch snapshots for those dates
  const where: Record<string, unknown> = {
    date: { in: paginatedDates },
  };
  if (symbolFilter) where.symbol = symbolFilter;

  const snapshots = await db.stockSnapshot.findMany({
    where,
    orderBy: [{ date: "desc" }, { upside: "desc" }],
  });

  // Count appearances for each symbol across all history
  const appearanceCounts = await db.stockSnapshot.groupBy({
    by: ["symbol"],
    _count: { date: true },
  });
  const appearanceMap = new Map(
    appearanceCounts.map((a) => [a.symbol, a._count.date])
  );

  // Group by date
  const dateGroups = new Map<string, typeof snapshots>();
  for (const snap of snapshots) {
    const key = snap.date.toISOString().split("T")[0];
    if (!dateGroups.has(key)) dateGroups.set(key, []);
    dateGroups.get(key)!.push(snap);
  }

  const dates = [...dateGroups.entries()].map(([date, picks]) => ({
    date,
    picks: picks.map((p) => ({
      symbol: p.symbol,
      name: p.name,
      price: p.price,
      target: p.target,
      upside: p.upside,
      buys: p.buys,
      holds: p.holds,
      sells: p.sells,
      analysts: p.analysts,
      sector: p.sector,
      risk: p.risk.toLowerCase(),
      region: p.region,
      marketCap: p.marketCap,
      appearances: appearanceMap.get(p.symbol) ?? 1,
    })),
  }));

  // Recurring: top 10 most-frequently-picked stocks
  const recurringRaw = await db.stockSnapshot.groupBy({
    by: ["symbol", "name"],
    _count: { date: true },
    _avg: { upside: true },
    orderBy: { _count: { date: "desc" } },
    take: 10,
  });

  const recurring = recurringRaw.map((r) => ({
    symbol: r.symbol,
    name: r.name,
    count: r._count.date,
    avgUpside: Math.round(r._avg.upside ?? 0),
  }));

  return NextResponse.json({
    dates,
    totalDates,
    page,
    recurring,
  });
});
