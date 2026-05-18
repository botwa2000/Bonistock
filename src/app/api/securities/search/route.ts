import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "8"), 20);

  const [stocks, etfs] = await Promise.all([
    db.stock.findMany({
      where: {
        OR: [
          { symbol: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        symbol: true,
        name: true,
        sector: true,
        upside: true,
        risk: true,
        price: true,
        analysts: true,
      },
      orderBy: [{ symbol: "asc" }],
      take: limit - 2,
    }),
    db.etf.findMany({
      where: {
        OR: [
          { symbol: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        symbol: true,
        name: true,
        theme: true,
        cagr1y: true,
      },
      take: 2,
    }),
  ]);

  const results = [
    ...stocks.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      assetType: "STOCK" as const,
      sector: s.sector,
      upside: s.upside,
      risk: s.risk,
      price: s.price,
      analysts: s.analysts,
    })),
    ...etfs.map((e) => ({
      symbol: e.symbol,
      name: e.name,
      assetType: "ETF" as const,
      sector: e.theme,
      upside: e.cagr1y ?? null,
      risk: null,
      price: null,
      analysts: null,
    })),
  ];

  // Prioritize exact symbol matches first
  results.sort((a, b) => {
    const aExact = a.symbol.toUpperCase() === q.toUpperCase() ? 0 : 1;
    const bExact = b.symbol.toUpperCase() === q.toUpperCase() ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    const aStarts = a.symbol.toUpperCase().startsWith(q.toUpperCase()) ? 0 : 1;
    const bStarts = b.symbol.toUpperCase().startsWith(q.toUpperCase()) ? 0 : 1;
    return aStarts - bStarts;
  });

  return NextResponse.json({ results: results.slice(0, limit) });
}
