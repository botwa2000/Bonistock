import { db } from "./db";
import {
  getStockUniverse,
  fetchStockQuote,
  fetchBatchQuotes,
  fetchPriceTarget,
  fetchStockProfile,
  fetchAnalystConsensus,
  getRemainingRequests,
} from "./fmp";

// ── Helpers ──

function deriveRegion(exchange: string): string {
  const ex = exchange.toUpperCase();
  if (ex.includes("NYSE") || ex.includes("NASDAQ") || ex.includes("AMEX")) return "us";
  if (
    ex.includes("XETRA") || ex.includes("EURONEXT") || ex.includes("LONDON") ||
    ex.includes("COPENHAGEN") || ex.includes("AMSTERDAM") || ex.includes("PARIS") ||
    ex.includes("MILAN") || ex.includes("ZURICH") || ex.includes("SIX")
  ) return "europe";
  return "em";
}

function deriveMarketCapLabel(mktCap: number): string {
  if (mktCap > 200_000_000_000) return "mega";
  if (mktCap > 10_000_000_000) return "large";
  if (mktCap > 2_000_000_000) return "mid";
  return "small";
}

function deriveRisk(mktCap: number): "LOW" | "BALANCED" | "HIGH" {
  if (mktCap > 100_000_000_000) return "LOW";
  if (mktCap < 20_000_000_000) return "HIGH";
  return "BALANCED";
}

function deriveBrokers(exchange: string): string[] {
  const ex = exchange.toUpperCase();
  if (ex.includes("NYSE") || ex.includes("NASDAQ") || ex.includes("AMEX")) {
    return ["ibkr", "t212", "robinhood", "etoro"];
  }
  if (ex.includes("XETRA")) {
    return ["ibkr", "traderepublic", "scalable", "ing", "comdirect"];
  }
  if (ex.includes("EURONEXT") || ex.includes("AMSTERDAM") || ex.includes("PARIS")) {
    return ["ibkr", "t212", "etoro"];
  }
  if (ex.includes("LONDON")) {
    return ["ibkr", "t212"];
  }
  // Emerging / other
  return ["ibkr", "t212", "etoro"];
}

// ── Snapshot helper ──

export async function snapshotAllStocks(): Promise<number> {
  const stocks = await db.stock.findMany();
  if (stocks.length === 0) return 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let count = 0;
  for (const s of stocks) {
    try {
      await db.stockSnapshot.upsert({
        where: { symbol_date: { symbol: s.symbol, date: today } },
        update: {
          name: s.name,
          price: s.price,
          target: s.target,
          upside: s.upside,
          buys: s.buys,
          holds: s.holds,
          sells: s.sells,
          analysts: s.analysts,
          sector: s.sector,
          risk: s.risk,
          region: s.region,
          marketCap: s.marketCap,
        },
        create: {
          symbol: s.symbol,
          name: s.name,
          price: s.price,
          target: s.target,
          upside: s.upside,
          buys: s.buys,
          holds: s.holds,
          sells: s.sells,
          analysts: s.analysts,
          sector: s.sector,
          risk: s.risk,
          region: s.region,
          marketCap: s.marketCap,
          date: today,
        },
      });
      count++;
    } catch {
      // skip duplicates / errors
    }
  }

  console.log(`[snapshot] Saved ${count} stock snapshots for ${today.toISOString().split("T")[0]}`);
  return count;
}

// ── Weekly Discovery (manual admin fallback) ──
// Primary discovery is now handled by the external Python script (scripts/discover.py)
// which runs daily via system crontab. This function remains as a manual fallback,
// callable via the admin "Discover Stocks" button.
//
// Uses a curated stock universe instead of FMP screener (which is restricted on current plan).
// Optimized for 250 calls/day budget:
//   Phase 1: Fetch quotes for all universe symbols (gives price, name, exchange, marketCap)
//   Phase 2: Fetch price targets for quoted symbols (gives upside data)
//   Phase 3: Rank by upside, upsert top 80 into DB using quote data directly
//   Phase 4: Enrich stocks that have sector="Unknown" with profile data (incremental)
// Skips expensive profile+grade calls for initial population — fills in over subsequent runs.

export async function discoverAndPopulateStocks(): Promise<{
  candidates: number;
  populated: number;
  errors: number;
}> {
  console.log("[discovery] Starting stock discovery via curated universe");
  let errors = 0;

  const universe = getStockUniverse();
  console.log(`[discovery] Universe: ${universe.length} candidate symbols`);

  // 1. Check which symbols already exist in DB (no API call)
  const existingStocks = await db.stock.findMany({
    select: { symbol: true, price: true, sector: true },
  });
  const existingMap = new Map(existingStocks.map((s) => [s.symbol, s]));

  // 2. Fetch quotes for NEW symbols not in DB (gets price, name, exchange, marketCap)
  //    Existing stocks already have prices, so skip them to save calls.
  const quoteMap = new Map<string, { price: number; name: string; exchange: string; marketCap: number; priceAvg200?: number }>();
  const newSymbols = universe.filter((s) => !existingMap.has(s));
  console.log(`[discovery] ${existingMap.size} existing, ${newSymbols.length} new symbols to quote`);

  for (const sym of newSymbols) {
    if (getRemainingRequests() < 60) {
      console.log(`[discovery] Saving budget for price targets, quoted ${quoteMap.size} new symbols`);
      break;
    }
    try {
      const quote = await fetchStockQuote(sym);
      if (quote && quote.price > 0) {
        quoteMap.set(sym, {
          price: quote.price,
          name: quote.name ?? sym,
          exchange: quote.exchange ?? "",
          marketCap: quote.marketCap ?? 0,
          priceAvg200: quote.priceAvg200,
        });
      }
    } catch {
      errors++;
    }
  }
  console.log(`[discovery] Quoted ${quoteMap.size} new symbols`);

  // 3. Build candidate list: existing (use DB price) + new (use quote price)
  //    All candidates that we have a price for.
  const allCandidates = new Map<string, { price: number; name: string; exchange: string; marketCap: number; priceAvg200?: number; isNew: boolean }>();

  for (const [sym, existing] of existingMap) {
    allCandidates.set(sym, {
      price: existing.price, name: "", exchange: "", marketCap: 0,
      isNew: false,
    });
  }
  for (const [sym, quote] of quoteMap) {
    allCandidates.set(sym, { ...quote, isNew: true });
  }

  // 4. Fetch price targets for all candidates with prices
  const targetMap = new Map<string, { targetConsensus: number; targetHigh: number; targetLow: number }>();
  for (const sym of allCandidates.keys()) {
    if (getRemainingRequests() < 15) {
      console.log("[discovery] Rate limit approaching, stopping target fetches");
      break;
    }
    try {
      const pt = await fetchPriceTarget(sym);
      if (pt && pt.targetConsensus > 0) targetMap.set(sym, pt);
    } catch {
      errors++;
    }
  }
  console.log(`[discovery] Got price targets for ${targetMap.size} symbols`);

  // 5. Calculate upside and rank
  interface Ranked {
    symbol: string;
    price: number;
    target: number;
    upside: number;
    name: string;
    exchange: string;
    marketCap: number;
    priceAvg200?: number;
    isNew: boolean;
  }
  const ranked: Ranked[] = [];

  for (const [sym, pt] of targetMap) {
    const cand = allCandidates.get(sym);
    if (!cand || cand.price <= 0) continue;
    const upside = ((pt.targetConsensus - cand.price) / cand.price) * 100;
    if (upside > 0 && upside < 200) {
      ranked.push({
        symbol: sym, price: cand.price, target: pt.targetConsensus,
        upside, name: cand.name, exchange: cand.exchange,
        marketCap: cand.marketCap, priceAvg200: cand.priceAvg200,
        isNew: cand.isNew,
      });
    }
  }

  ranked.sort((a, b) => b.upside - a.upside);
  const top = ranked.slice(0, 80);
  console.log(`[discovery] Ranked ${ranked.length} total, taking top ${top.length} by upside`);

  // 6. Upsert stocks into DB
  let populated = 0;
  for (const stock of top) {
    try {
      if (!stock.isNew) {
        // Existing stock: update target + upside
        await db.stock.update({
          where: { symbol: stock.symbol },
          data: {
            target: stock.target,
            upside: Math.round(stock.upside),
          },
        });
        populated++;
        continue;
      }

      // New stock: create using quote data (no profile/grade calls needed)
      const exchange = stock.exchange;
      const mktCap = stock.marketCap;
      const upside = Math.round(stock.upside);

      const stockData = {
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        target: stock.target,
        upside,
        buys: 0,
        holds: 0,
        sells: 0,
        analysts: 0,
        sector: "Unknown",
        risk: deriveRisk(mktCap),
        horizon: "12M",
        region: deriveRegion(exchange),
        exchange,
        currency: "USD",
        dividendYield: null as number | null,
        marketCap: deriveMarketCapLabel(mktCap),
        description: "",
        whyThisPick: `Price target of $${Math.round(stock.target)} implies ${upside}% upside from current levels.`,
        belowSma200: stock.priceAvg200 ? stock.price < stock.priceAvg200 : false,
      };

      const brokers = deriveBrokers(exchange);

      const upserted = await db.stock.upsert({
        where: { symbol: stock.symbol },
        update: stockData,
        create: stockData,
      });

      await db.stockBroker.deleteMany({ where: { stockId: upserted.id } });
      for (const brokerId of brokers) {
        await db.stockBroker.create({
          data: { stockId: upserted.id, brokerId },
        }).catch(() => { /* broker may not exist */ });
      }

      populated++;
    } catch (err) {
      console.error(`[discovery] Failed to process ${stock.symbol}:`, err);
      errors++;
    }
  }

  // 7. Enrich stocks that still have sector="Unknown" (incremental, use remaining budget)
  const unknownSector = await db.stock.findMany({
    where: { sector: "Unknown" },
    select: { id: true, symbol: true },
  });
  let enriched = 0;
  for (const stock of unknownSector) {
    if (getRemainingRequests() < 5) break;
    try {
      const profile = await fetchStockProfile(stock.symbol);
      if (profile) {
        await db.stock.update({
          where: { id: stock.id },
          data: {
            name: profile.companyName,
            sector: profile.sector || "Unknown",
            currency: profile.currency,
            exchange: profile.exchange,
            description: profile.description?.slice(0, 500) ?? "",
            region: deriveRegion(profile.exchange),
          },
        });
        enriched++;
      }
    } catch {
      // skip, will retry next run
    }
  }
  if (enriched > 0) console.log(`[discovery] Enriched ${enriched} stocks with profile data`);

  // 8. Save daily snapshot
  await snapshotAllStocks();

  console.log(`[discovery] Complete: ${populated} stocks populated, ${errors} errors`);
  return { candidates: universe.length, populated, errors };
}

// ── Daily Refresh (manual admin fallback) ──
// Primary refresh is now handled by the external Python script (scripts/discover.py).
// This function remains as a manual fallback for admin use.
// Budget: ~80 stocks × 2 calls (quote + target) = 160 calls, well within 250.
// Enriches stocks with sector="Unknown" if budget allows.

export async function refreshStockData(): Promise<void> {
  const stocks = await db.stock.findMany({ select: { id: true, symbol: true, sector: true } });
  console.log(`[refresh] Refreshing ${stocks.length} stocks`);

  for (const stock of stocks) {
    if (getRemainingRequests() < 20) {
      console.log("[refresh] FMP rate limit approaching, stopping refresh");
      break;
    }

    try {
      const [quote, target] = await Promise.all([
        fetchStockQuote(stock.symbol).catch(() => null),
        fetchPriceTarget(stock.symbol).catch(() => null),
      ]);

      if (quote && target) {
        await db.stock.update({
          where: { id: stock.id },
          data: {
            price: quote.price,
            target: target.targetConsensus,
            upside: Math.round(((target.targetConsensus - quote.price) / quote.price) * 100),
            belowSma200: quote.priceAvg200 ? quote.price < quote.priceAvg200 : false,
          },
        });
      }
    } catch (err) {
      console.error(`[refresh] Failed to refresh ${stock.symbol}:`, err);
    }
  }

  // Enrich stocks with missing sector data using remaining budget
  const unknownSector = stocks.filter((s) => s.sector === "Unknown");
  let enriched = 0;
  for (const stock of unknownSector) {
    if (getRemainingRequests() < 5) break;
    try {
      const profile = await fetchStockProfile(stock.symbol);
      if (profile) {
        await db.stock.update({
          where: { id: stock.id },
          data: {
            name: profile.companyName,
            sector: profile.sector || "Unknown",
            currency: profile.currency,
            exchange: profile.exchange,
            description: profile.description?.slice(0, 500) ?? "",
            region: deriveRegion(profile.exchange),
          },
        });
        enriched++;
      }
    } catch {
      // skip, will retry next run
    }
  }
  if (enriched > 0) console.log(`[refresh] Enriched ${enriched} stocks with profile data`);

  // Save daily snapshot after refresh
  await snapshotAllStocks();
}

// ── Dev Sync from Prod ──

export async function syncFromProd(): Promise<{ stocks: number; etfs: number }> {
  const source = process.env.STOCK_SYNC_SOURCE;
  if (!source) throw new Error("STOCK_SYNC_SOURCE is not set");

  console.log(`[sync] Syncing stocks from ${source}`);
  const res = await fetch(`${source}/api/stocks/export`);
  if (!res.ok) throw new Error(`Export fetch failed: ${res.status}`);

  const data = await res.json() as {
    stocks: Array<{
      symbol: string; name: string; price: number; target: number; upside: number;
      buys: number; holds: number; sells: number; analysts: number; sector: string;
      risk: "LOW" | "BALANCED" | "HIGH"; horizon: string; region: string; exchange: string;
      currency: string; dividendYield: number | null; marketCap: string; description: string;
      whyThisPick: string; belowSma200: boolean; brokers: string[];
    }>;
    etfs: Array<{
      symbol: string; name: string; cagr1y: number; cagr3y: number; cagr5y: number;
      drawdown: number; fee: number; sharpe: number; theme: string; region: string;
      exchange: string; currency: string; description: string; brokers: string[];
    }>;
  };

  // Upsert stocks
  for (const s of data.stocks) {
    const { brokers, ...stockData } = s;
    const stock = await db.stock.upsert({
      where: { symbol: s.symbol },
      update: stockData,
      create: stockData,
    });
    await db.stockBroker.deleteMany({ where: { stockId: stock.id } });
    for (const brokerId of brokers) {
      await db.stockBroker.create({
        data: { stockId: stock.id, brokerId },
      }).catch(() => { /* broker may not exist in dev */ });
    }
  }

  // Upsert ETFs
  for (const e of data.etfs) {
    const { brokers, ...etfData } = e;
    const etf = await db.etf.upsert({
      where: { symbol: e.symbol },
      update: etfData,
      create: etfData,
    });
    await db.etfBroker.deleteMany({ where: { etfId: etf.id } });
    for (const brokerId of brokers) {
      await db.etfBroker.create({
        data: { etfId: etf.id, brokerId },
      }).catch(() => { /* broker may not exist in dev */ });
    }
  }

  console.log(`[sync] Synced ${data.stocks.length} stocks + ${data.etfs.length} ETFs from prod`);
  return { stocks: data.stocks.length, etfs: data.etfs.length };
}
