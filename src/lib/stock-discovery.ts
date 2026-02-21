import { db } from "./db";
import {
  fetchScreenerStocks,
  fetchBatchQuotes,
  fetchPriceTarget,
  fetchStockProfile,
  fetchAnalystConsensus,
  fetchStockQuote,
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

// ── Weekly Discovery (prod only) ──

export async function discoverAndPopulateStocks(): Promise<{
  candidates: number;
  populated: number;
  errors: number;
}> {
  console.log("[discovery] Starting stock discovery via FMP screener");
  let errors = 0;

  // 1. Screener: 1 call → ~100 candidate symbols
  const candidates = await fetchScreenerStocks(100);
  console.log(`[discovery] Screener returned ${candidates.length} candidates`);

  // 2. Batch quotes: ~2 calls → prices + priceAvg200
  const symbols = candidates.map((c) => c.symbol);
  const quotes = await fetchBatchQuotes(symbols);
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

  // 3. Price targets: 1 call per symbol
  const targetMap = new Map<string, { targetConsensus: number; targetHigh: number; targetLow: number }>();
  for (const sym of symbols) {
    if (getRemainingRequests() < 20) {
      console.log("[discovery] Rate limit approaching, stopping target fetches");
      break;
    }
    try {
      const pt = await fetchPriceTarget(sym);
      if (pt) targetMap.set(sym, pt);
    } catch {
      errors++;
    }
  }

  // 4. Rank by upside, pick top 60
  const ranked = candidates
    .filter((c) => quoteMap.has(c.symbol) && targetMap.has(c.symbol))
    .map((c) => {
      const quote = quoteMap.get(c.symbol)!;
      const target = targetMap.get(c.symbol)!;
      const price = quote.price || c.price;
      const upside = price > 0 ? ((target.targetConsensus - price) / price) * 100 : 0;
      return { ...c, price, target: target.targetConsensus, upside, priceAvg200: quote.priceAvg200 };
    })
    .filter((c) => c.upside > 0 && c.upside < 200) // filter unrealistic targets
    .sort((a, b) => b.upside - a.upside)
    .slice(0, 60);

  console.log(`[discovery] Ranked ${ranked.length} stocks by upside`);

  // 5. Profiles + 6. Grades for top 60
  let populated = 0;
  for (const stock of ranked) {
    if (getRemainingRequests() < 5) {
      console.log("[discovery] Rate limit approaching, stopping");
      break;
    }

    try {
      // Fetch profile (1 call) + analyst consensus (1 call)
      const [profile, consensus] = await Promise.all([
        fetchStockProfile(stock.symbol).catch(() => null),
        fetchAnalystConsensus(stock.symbol).catch(() => null),
      ]);

      const buys = (consensus?.strongBuy ?? 0) + (consensus?.buy ?? 0);
      const holds = consensus?.hold ?? 0;
      const sells = consensus?.sell ?? 0;
      const totalAnalysts = buys + holds + sells;
      const buyPct = totalAnalysts > 0 ? Math.round((buys / totalAnalysts) * 100) : 0;

      const exchange = profile?.exchangeShortName ?? stock.exchangeShortName ?? stock.exchange;
      const mktCap = profile?.mktCap ?? stock.marketCap;
      const upside = Math.round(stock.upside);

      const whyThisPick = totalAnalysts > 0
        ? `${totalAnalysts} analysts cover this stock with ${buyPct}% buy consensus. Target of $${Math.round(stock.target)} implies ${upside}% upside.`
        : `Price target of $${Math.round(stock.target)} implies ${upside}% upside from current levels.`;

      const stockData = {
        symbol: stock.symbol,
        name: profile?.companyName ?? stock.companyName,
        price: stock.price,
        target: stock.target,
        upside,
        buys,
        holds,
        sells,
        analysts: totalAnalysts,
        sector: profile?.sector ?? stock.sector ?? "Unknown",
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

  console.log(`[discovery] Complete: ${populated} stocks populated, ${errors} errors`);
  return { candidates: candidates.length, populated, errors };
}

// ── Daily Refresh (reuses existing pattern, for prod) ──

export async function refreshStockData(): Promise<void> {
  const stocks = await db.stock.findMany({ select: { id: true, symbol: true } });
  console.log(`[refresh] Refreshing ${stocks.length} stocks`);

  for (const stock of stocks) {
    if (getRemainingRequests() < 10) {
      console.log("[refresh] FMP rate limit approaching, stopping refresh");
      break;
    }

    try {
      const quote = await fetchStockQuote(stock.symbol);
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
