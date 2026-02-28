import { NextRequest, NextResponse } from "next/server";
import { authenticatedRoute } from "@/lib/api-utils";
import { getUserTier, hasActivePassWindow } from "@/lib/tier";
import { db } from "@/lib/db";

const ITEMS_PER_PAGE = 25;

export const GET = authenticatedRoute(async (req: NextRequest, { userId }) => {
  const tier = await getUserTier(userId);
  if (tier === "free") {
    return NextResponse.json(
      { error: "Pick History requires Plus or Pass", code: "TIER_REQUIRED" },
      { status: 401 }
    );
  }
  if (tier === "pass") {
    const active = await hasActivePassWindow(userId);
    if (!active) {
      return NextResponse.json(
        { error: "Activate your Day Pass to access Pick History", code: "PASS_NOT_ACTIVE" },
        { status: 401 }
      );
    }
  }

  const { searchParams } = req.nextUrl;
  const view = searchParams.get("view") ?? "stocks";

  // ── Timeline view for a single stock ──
  if (view === "timeline") {
    const symbol = searchParams.get("symbol");
    if (!symbol) {
      return NextResponse.json({ error: "symbol is required for timeline view" }, { status: 400 });
    }

    const snapshots = await db.stockSnapshot.findMany({
      where: { symbol },
      orderBy: { date: "desc" },
      select: {
        date: true,
        price: true,
        target: true,
        upside: true,
        analysts: true,
        risk: true,
      },
    });

    return NextResponse.json({
      symbol,
      timeline: snapshots.map((s) => ({
        date: s.date.toISOString().split("T")[0],
        price: s.price,
        target: s.target,
        upside: s.upside,
        analysts: s.analysts,
        risk: s.risk.toLowerCase(),
      })),
    });
  }

  // ── Stock-centric view (default) ──
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const search = searchParams.get("search") ?? "";
  const sector = searchParams.get("sector") ?? "";
  const dateRange = searchParams.get("dateRange") ?? "all";
  const sortBy = searchParams.get("sortBy") ?? "appearances";

  // Build date filter
  let dateFilter: Date | undefined;
  if (dateRange === "7d") {
    dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (dateRange === "30d") {
    dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } else if (dateRange === "90d") {
    dateFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  }

  // Use raw SQL for efficient groupBy with filters
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (dateFilter) {
    conditions.push(`date >= $${paramIdx}`);
    params.push(dateFilter);
    paramIdx++;
  }
  if (search) {
    conditions.push(`(symbol ILIKE $${paramIdx} OR name ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }
  if (sector) {
    conditions.push(`sector = $${paramIdx}`);
    params.push(sector);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Determine sort column
  let orderClause: string;
  switch (sortBy) {
    case "latestUpside":
      orderClause = '"latestUpside" DESC';
      break;
    case "avgUpside":
      orderClause = '"avgUpside" DESC';
      break;
    case "name":
      orderClause = "name ASC";
      break;
    default:
      orderClause = "appearances DESC";
  }

  const offset = (page - 1) * ITEMS_PER_PAGE;

  // Count total unique symbols
  const countResult = await db.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT COUNT(*) as count FROM (
      SELECT symbol FROM stock_snapshots ${whereClause} GROUP BY symbol
    ) sub`,
    ...params
  );
  const totalItems = Number(countResult[0]?.count ?? 0);

  // Grouped query
  const stocks = await db.$queryRawUnsafe<Array<{
    symbol: string;
    name: string;
    sector: string;
    region: string;
    appearances: bigint;
    avgUpside: number;
    latestUpside: number;
    firstDate: Date;
    lastDate: Date;
  }>>(
    `SELECT
      symbol,
      MAX(name) as name,
      MAX(sector) as sector,
      MAX(region) as region,
      COUNT(*)::bigint as appearances,
      ROUND(AVG(upside))::int as "avgUpside",
      (ARRAY_AGG(upside ORDER BY date DESC))[1] as "latestUpside",
      MIN(date) as "firstDate",
      MAX(date) as "lastDate"
    FROM stock_snapshots
    ${whereClause}
    GROUP BY symbol
    ORDER BY ${orderClause}
    LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}`,
    ...params
  );

  // Get distinct sectors for filter dropdown
  const sectors = await db.$queryRawUnsafe<Array<{ sector: string }>>(
    `SELECT DISTINCT sector FROM stock_snapshots WHERE sector != '' ORDER BY sector`
  );

  // Recurring: top 5 most-frequently-picked stocks (always across all data)
  const recurringRaw = await db.stockSnapshot.groupBy({
    by: ["symbol", "name"],
    _count: { date: true },
    _avg: { upside: true },
    orderBy: { _count: { date: "desc" } },
    take: 5,
  });

  const recurring = recurringRaw.map((r) => ({
    symbol: r.symbol,
    name: r.name,
    count: r._count.date,
    avgUpside: Math.round(r._avg.upside ?? 0),
  }));

  return NextResponse.json({
    stocks: stocks.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      region: s.region,
      appearances: Number(s.appearances),
      avgUpside: Number(s.avgUpside),
      latestUpside: Number(s.latestUpside),
      firstDate: s.firstDate instanceof Date ? s.firstDate.toISOString().split("T")[0] : String(s.firstDate).split("T")[0],
      lastDate: s.lastDate instanceof Date ? s.lastDate.toISOString().split("T")[0] : String(s.lastDate).split("T")[0],
    })),
    totalItems,
    page,
    totalPages: Math.ceil(totalItems / ITEMS_PER_PAGE),
    sectors: sectors.map((s) => s.sector),
    recurring,
  });
});
