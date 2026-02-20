import cron from "node-cron";
import { db } from "./db";
import { fetchStockQuote, fetchPriceTarget, getRemainingRequests } from "./fmp";

export function initCronJobs(): void {
  // Nightly stock data refresh — 2 AM UTC
  cron.schedule("0 2 * * *", async () => {
    console.log("[cron] Starting nightly stock data refresh");
    try {
      await refreshStockData();
    } catch (err) {
      console.error("[cron] Stock refresh failed:", err);
    }
  });

  // Weekly ETF data refresh — Sunday 3 AM UTC
  cron.schedule("0 3 * * 0", async () => {
    console.log("[cron] Starting weekly ETF data refresh");
    try {
      await refreshEtfData();
    } catch (err) {
      console.error("[cron] ETF refresh failed:", err);
    }
  });

  // Daily demo portfolio snapshot — 4 AM UTC
  cron.schedule("0 4 * * *", async () => {
    console.log("[cron] Updating demo portfolio snapshots");
    try {
      await updateDemoPortfolioSnapshots();
    } catch (err) {
      console.error("[cron] Demo portfolio snapshot failed:", err);
    }
  });

  console.log("[cron] Scheduled: stock refresh (2 AM), ETF refresh (Sun 3 AM), demo snapshots (4 AM)");
}

async function refreshStockData(): Promise<void> {
  const stocks = await db.stock.findMany({ select: { id: true, symbol: true } });

  for (const stock of stocks) {
    if (getRemainingRequests() < 10) {
      console.log("[cron] FMP rate limit approaching, stopping refresh");
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
      console.error(`[cron] Failed to refresh ${stock.symbol}:`, err);
    }
  }
}

async function refreshEtfData(): Promise<void> {
  // ETF data refresh via yfinance would be called here
  // For now, this is a placeholder — ETF data is less frequently updated
  console.log("[cron] ETF refresh — using seeded data (yfinance integration pending server Python setup)");
}

async function updateDemoPortfolioSnapshots(): Promise<void> {
  const portfolios = await db.demoPortfolio.findMany({
    include: {
      snapshots: {
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const volatility: Record<string, number> = {
    BUY_AND_HOLD: 0.003,
    ACTIVE_ROTATION: 0.006,
    DIVIDEND_FOCUS: 0.002,
    BALANCED_GROWTH: 0.004,
  };

  for (const portfolio of portfolios) {
    const lastSnapshot = portfolio.snapshots[0];
    if (!lastSnapshot) continue;

    // Don't create duplicate for today
    const lastDate = new Date(lastSnapshot.date);
    lastDate.setHours(0, 0, 0, 0);
    if (lastDate.getTime() === today.getTime()) continue;

    const vol = volatility[portfolio.strategy] ?? 0.003;
    const dailyReturn = 0.0004 + (Math.random() - 0.5) * vol; // ~10% annual + noise
    const newValue = lastSnapshot.totalValue * (1 + dailyReturn);
    const newReturnPct = ((newValue - portfolio.initialAmount) / portfolio.initialAmount) * 100;

    await db.demoPortfolioSnapshot.create({
      data: {
        demoPortfolioId: portfolio.id,
        date: today,
        totalValue: Math.round(newValue * 100) / 100,
        returnPct: Math.round(newReturnPct * 100) / 100,
        holdings: portfolio.holdings as object,
      },
    });
  }
}
