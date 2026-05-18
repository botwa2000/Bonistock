import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";

const querySchema = z.object({
  q: z.string().min(1).max(20),
});

interface SearchResult {
  symbol: string;
  name: string;
  type: "STOCK" | "ETF";
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const parsed = querySchema.safeParse({ q });

  if (!parsed.success) {
    log.warn("stocks/search", "Invalid query", parsed.error.issues);
    return NextResponse.json(
      { error: "Invalid query", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const query = q.trim().toUpperCase();

  const [stocks, etfs] = await Promise.all([
    db.$queryRaw<Array<{ symbol: string; name: string }>>`
      SELECT symbol, name
      FROM "Stock"
      WHERE UPPER(symbol) LIKE ${"%" + query + "%"}
         OR UPPER(name) LIKE ${"%" + query + "%"}
      ORDER BY
        CASE WHEN UPPER(symbol) = ${query} THEN 0 ELSE 1 END,
        CASE WHEN UPPER(symbol) LIKE ${query + "%"} THEN 0 ELSE 1 END,
        symbol
      LIMIT 10
    `,
    db.$queryRaw<Array<{ symbol: string; name: string }>>`
      SELECT symbol, name
      FROM "Etf"
      WHERE UPPER(symbol) LIKE ${"%" + query + "%"}
         OR UPPER(name) LIKE ${"%" + query + "%"}
      ORDER BY
        CASE WHEN UPPER(symbol) = ${query} THEN 0 ELSE 1 END,
        CASE WHEN UPPER(symbol) LIKE ${query + "%"} THEN 0 ELSE 1 END,
        symbol
      LIMIT 10
    `,
  ]);

  const results: SearchResult[] = [
    ...stocks.map((s) => ({ symbol: s.symbol, name: s.name, type: "STOCK" as const })),
    ...etfs.map((e) => ({ symbol: e.symbol, name: e.name, type: "ETF" as const })),
  ];

  // Sort combined results: exact symbol match first, then startsWith symbol, then name match
  results.sort((a, b) => {
    const aExact = a.symbol.toUpperCase() === query ? 0 : 1;
    const bExact = b.symbol.toUpperCase() === query ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;

    const aStarts = a.symbol.toUpperCase().startsWith(query) ? 0 : 1;
    const bStarts = b.symbol.toUpperCase().startsWith(query) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;

    return a.symbol.localeCompare(b.symbol);
  });

  const limited = results.slice(0, 10);

  log.info("stocks/search", `Returning ${limited.length} results (${Date.now() - start}ms)`);
  return NextResponse.json({ results: limited });
}
