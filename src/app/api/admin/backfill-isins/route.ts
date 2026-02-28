import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

const FMP_BASE = "https://financialmodelingprep.com/api/v3/profile";
const FINNHUB_BASE = "https://finnhub.io/api/v1/stock/profile2";

async function fetchFmpIsins(
  symbols: string[],
  apiKey: string
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const batchSize = 50;

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const joined = batch.map((s) => encodeURIComponent(s)).join(",");
    try {
      const res = await fetch(
        `${FMP_BASE}/${joined}?apikey=${apiKey}`,
        { headers: { "User-Agent": "Bonistock/1.0" } }
      );
      if (res.ok) {
        const data = await res.json();
        for (const profile of data) {
          const isin = profile?.isin;
          if (typeof isin === "string" && isin.length === 12) {
            result[profile.symbol] = isin;
          }
        }
      }
    } catch {
      // continue on error
    }
  }

  return result;
}

async function fetchFinnhubIsin(
  symbol: string,
  apiKey: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${FINNHUB_BASE}?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { headers: { "User-Agent": "Bonistock/1.0" } }
    );
    if (res.ok) {
      const data = await res.json();
      const isin = data?.isin;
      if (typeof isin === "string" && isin.length === 12) return isin;
    }

    // For .DE/.L symbols: try stripped symbol
    if (symbol.includes(".")) {
      const stripped = symbol.split(".")[0];
      const res2 = await fetch(
        `${FINNHUB_BASE}?symbol=${encodeURIComponent(stripped)}&token=${apiKey}`,
        { headers: { "User-Agent": "Bonistock/1.0" } }
      );
      if (res2.ok) {
        const data2 = await res2.json();
        const isin2 = data2?.isin;
        if (typeof isin2 === "string" && isin2.length === 12) return isin2;
      }
    }
  } catch {
    // continue on error
  }
  return null;
}

export const POST = adminRoute(async () => {
  const fmpKey = process.env.FMP_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;

  // Get all stocks and ETFs missing ISINs
  const [stocks, etfs] = await Promise.all([
    db.stock.findMany({ where: { isin: null }, select: { id: true, symbol: true } }),
    db.etf.findMany({ where: { isin: null }, select: { id: true, symbol: true } }),
  ]);

  const allItems = [
    ...stocks.map((s) => ({ ...s, table: "stock" as const })),
    ...etfs.map((e) => ({ ...e, table: "etf" as const })),
  ];

  const total = allItems.length;
  if (total === 0) {
    const [stockCount, etfCount] = await Promise.all([
      db.stock.count(),
      db.etf.count(),
    ]);
    return NextResponse.json({
      total: stockCount + etfCount,
      filled: 0,
      remaining: 0,
      message: "All stocks and ETFs already have ISINs",
    });
  }

  const isinMap: Record<string, string> = {};

  // Phase 1: FMP batch lookup
  if (fmpKey) {
    const symbols = allItems.map((item) => item.symbol);
    const fmpResults = await fetchFmpIsins(symbols, fmpKey);
    Object.assign(isinMap, fmpResults);
  }

  // Phase 2: Finnhub for remaining (rate-limited: 60/min → 1.1s between calls)
  if (finnhubKey) {
    const remaining = allItems.filter((item) => !isinMap[item.symbol]);
    for (const item of remaining) {
      const isin = await fetchFinnhubIsin(item.symbol, finnhubKey);
      if (isin) isinMap[item.symbol] = isin;
      // Rate limit: 60 calls/min
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  // Phase 3: Write ISINs to DB
  let filled = 0;
  for (const item of allItems) {
    const isin = isinMap[item.symbol];
    if (!isin) continue;

    if (item.table === "stock") {
      await db.stock.update({
        where: { id: item.id },
        data: { isin },
      });
    } else {
      await db.etf.update({
        where: { id: item.id },
        data: { isin },
      });
    }
    filled++;
  }

  const remaining = total - filled;
  return NextResponse.json({ total, filled, remaining });
});
