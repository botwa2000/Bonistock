import cron from "node-cron";
import { db } from "./db";
import {
  discoverAndPopulateStocks,
  refreshStockData as refreshStocksViaDiscovery,
  syncFromProd,
} from "./stock-discovery";

export function initCronJobs(): void {
  if (process.env.STOCK_SYNC_SOURCE) {
    // DEV MODE: sync from prod daily at 4 AM UTC (after prod refreshes at 2 AM)
    cron.schedule("0 4 * * *", async () => {
      console.log("[cron] DEV: syncing stocks from prod");
      try {
        await syncFromProd();
      } catch (err) {
        console.error("[cron] Dev sync failed:", err);
      }
    });
    console.log("[cron] DEV mode: scheduled prod sync (4 AM UTC)");
  } else {
    // PROD MODE: weekly discovery (Sunday 1 AM) + daily refresh (Mon-Sat 2 AM)
    cron.schedule("0 1 * * 0", async () => {
      console.log("[cron] Starting weekly stock discovery");
      try {
        await discoverAndPopulateStocks();
      } catch (err) {
        console.error("[cron] Stock discovery failed:", err);
      }
    });

    cron.schedule("0 2 * * 1-6", async () => {
      console.log("[cron] Starting daily stock data refresh");
      try {
        await refreshStocksViaDiscovery();
      } catch (err) {
        console.error("[cron] Stock refresh failed:", err);
      }
    });
    console.log("[cron] PROD mode: scheduled discovery (Sun 1 AM) + refresh (Mon-Sat 2 AM)");
  }

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

  console.log("[cron] Scheduled: ETF refresh (Sun 3 AM), demo snapshots (4 AM)");
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
