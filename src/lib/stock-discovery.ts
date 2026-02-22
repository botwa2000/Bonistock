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

// ── Weekly Discovery (prod only) ──
// Uses a curated stock universe instead of FMP screener (which is restricted on current plan).
// Flow: fetch price targets for universe → rank by upside → fetch quotes for top picks
// → profile+grade only for new-to-DB stocks.

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
    select: { symbol: true, price: true },
  });
  const existingMap = new Map(existingStocks.map((s) => [s.symbol, s.price]));

  // 2. Fetch price targets for as many candidates as budget allows
  //    ~150 calls, stop at 40 remaining to save budget for quotes+profiles
  const targetMap = new Map<string, { targetConsensus: number; targetHigh: number; targetLow: number }>();
  for (const sym of universe) {
    if (getRemainingRequests() < 40) {
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

  // 3. Rank by upside using existing DB prices or fetch individual quotes
  //    For symbols in DB: use stored price (saves calls)
  //    For new symbols: need a quote to calculate upside
  interface Candidate {
    symbol: string;
    price: number;
    target: number;
    upside: number;
    priceAvg200?: number;
    exchange: string;
    name: string;
    marketCap: number;
    isNew: boolean;
  }
  const candidates: Candidate[] = [];

  for (const [sym, pt] of targetMap) {
    const dbPrice = existingMap.get(sym);
    if (dbPrice && dbPrice > 0) {
      // Use DB price — no API call needed
      const upside = ((pt.targetConsensus - dbPrice) / dbPrice) * 100;
      candidates.push({
        symbol: sym, price: dbPrice, target: pt.targetConsensus,
        upside, exchange: "", name: "", marketCap: 0, isNew: false,
      });
    } else {
      // New symbol: fetch quote (1 call)
      if (getRemainingRequests() < 30) continue;
      try {
        const quote = await fetchStockQuote(sym);
        if (quote && quote.price > 0) {
          const upside = ((pt.targetConsensus - quote.price) / quote.price) * 100;
          candidates.push({
            symbol: sym, price: quote.price, target: pt.targetConsensus,
            upside, priceAvg200: quote.priceAvg200,
            exchange: quote.exchange ?? "", name: quote.name ?? sym,
            marketCap: quote.marketCap ?? 0, isNew: true,
          });
        }
      } catch {
        errors++;
      }
    }
  }

  // 4. Rank by upside, pick top 80
  const ranked = candidates
    .filter((c) => c.upside > 0 && c.upside < 200)
    .sort((a, b) => b.upside - a.upside)
    .slice(0, 80);

  console.log(`[discovery] Ranked ${ranked.length} stocks by upside`);

  // 5. Populate stocks
  let populated = 0;
  for (const stock of ranked) {
    if (getRemainingRequests() < 5) {
      console.log("[discovery] Rate limit approaching, stopping");
      break;
    }

    try {
      if (!stock.isNew) {
        // Existing stock: just update price/target/upside (already fetched target)
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

      // New stock: fetch profile (1 call) + analyst consensus (1 call)
      const [profile, consensus] = await Promise.all([
        fetchStockProfile(stock.symbol).catch(() => null),
        fetchAnalystConsensus(stock.symbol).catch(() => null),
      ]);

      const buys = (consensus?.strongBuy ?? 0) + (consensus?.buy ?? 0);
      const holds = consensus?.hold ?? 0;
      const sells = consensus?.sell ?? 0;
      const totalAnalysts = buys + holds + sells;
      const buyPct = totalAnalysts > 0 ? Math.round((buys / totalAnalysts) * 100) : 0;

      const exchange = profile?.exchange ?? stock.exchange;
      const mktCap = profile?.marketCap ?? stock.marketCap;
      const upside = Math.round(stock.upside);

      const whyThisPick = totalAnalysts > 0
        ? `${totalAnalysts} analysts cover this stock with ${buyPct}% buy consensus. Target of $${Math.round(stock.target)} implies ${upside}% upside.`
        : `Price target of $${Math.round(stock.target)} implies ${upside}% upside from current levels.`;

      const stockData = {
        symbol: stock.symbol,
        name: profile?.companyName ?? stock.name,
        price: stock.price,
        target: stock.target,
        upside,
        buys,
        holds,
        sells,
        analysts: totalAnalysts,
        sector: profile?.sector ?? "Unknown",
        risk: deriveRisk(mktCap),
        horizon: "12M",
        region: deriveRegion(exchange),
        exchange,
        currency: profile?.currency ?? "USD",
        dividendYield: null as number | null,
        marketCap: deriveMarketCapLabel(mktCap),
        description: profile?.description?.slice(0, 500) ?? "",
        whyThisPick,
        belowSma200: stock.priceAvg200 ? stock.price < stock.priceAvg200 : false,
      };

      const brokers = deriveBrokers(exchange);

      // Upsert stock
      const upserted = await db.stock.upsert({
        where: { symbol: stock.symbol },
        update: stockData,
        create: stockData,
      });

      // Set broker availability
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

  // 6. Save daily snapshot
  await snapshotAllStocks();

  console.log(`[discovery] Complete: ${populated} stocks populated, ${errors} errors`);
  return { candidates: universe.length, populated, errors };
}

// ── Daily Refresh (reuses existing pattern, for prod) ──
// Note: batch quotes now use individual calls since FMP multi-symbol is restricted.

export async function refreshStockData(): Promise<void> {
  const stocks = await db.stock.findMany({ select: { id: true, symbol: true } });
  console.log(`[refresh] Refreshing ${stocks.length} stocks`);

  // Fetch quotes individually (batch multi-symbol is restricted on current FMP plan)
  const quotes = await fetchBatchQuotes(stocks.map((s) => s.symbol));
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

  for (const stock of stocks) {
    if (getRemainingRequests() < 10) {
      console.log("[refresh] FMP rate limit approaching, stopping refresh");
      break;
    }

    try {
      const quote = quoteMap.get(stock.symbol);
      const target = await fetchPriceTarget(stock.symbol);

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
