import cron from "node-cron";
import { db } from "./db";
import { syncFromProd } from "./stock-discovery";
import { sendPushToUser } from "./push";
import { sendEmail } from "./email";

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
    // PROD MODE: stock discovery handled by external Python script (scripts/discover.py)
    // Runs daily at 2 AM UTC via system crontab on the Hetzner host.
    // Fetches data once, writes to prod DB, then copies to dev DB automatically.
    // Manual fallback: admin "Discover Stocks" button still calls discoverAndPopulateStocks().
    console.log("[cron] PROD mode: stock discovery handled by external Python script");
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

  // Alert evaluation — every 30 min during market hours (Mon–Fri 8:00–20:00 UTC)
  cron.schedule("*/30 8-20 * * 1-5", async () => {
    console.log("[cron] Evaluating price alerts");
    try {
      await evaluateAlerts();
    } catch (err) {
      console.error("[cron] Alert evaluation failed:", err);
    }
  });

  console.log("[cron] Scheduled: ETF refresh (Sun 3 AM), demo snapshots (4 AM), alerts (every 30min Mon-Fri 8-20 UTC)");
}

async function refreshEtfData(): Promise<void> {
  // ETF data is now handled by external Python script (scripts/etf-discover.py)
  // Runs weekly at 3 AM UTC Sunday via system crontab on the Hetzner host.
  // The cron job here is kept as a no-op placeholder for logging purposes.
  console.log("[cron] ETF refresh — handled by external Python script (scripts/etf-discover.py)");
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

async function evaluateAlerts(): Promise<void> {
  const alerts = await db.alert.findMany({
    where: { triggered: false },
    include: { user: { select: { id: true, email: true, emailAlerts: true } } },
  });

  if (alerts.length === 0) return;

  // Gather unique symbols to look up
  const symbols = [...new Set(alerts.map((a) => a.symbol))];
  const stocks = await db.stock.findMany({
    where: { symbol: { in: symbols } },
    select: { symbol: true, price: true },
  });
  const priceMap = new Map(stocks.map((s) => [s.symbol, s.price]));

  for (const alert of alerts) {
    const currentPrice = priceMap.get(alert.symbol);
    if (currentPrice == null) continue;

    const condition = alert.condition as { operator?: string; value?: number };
    if (!condition.operator || condition.value == null) continue;

    let shouldTrigger = false;
    if (condition.operator === "gte" && currentPrice >= condition.value) shouldTrigger = true;
    if (condition.operator === "lte" && currentPrice <= condition.value) shouldTrigger = true;

    if (shouldTrigger) {
      await db.alert.update({
        where: { id: alert.id },
        data: { triggered: true, triggeredAt: new Date() },
      });

      const alertBody = alert.message ?? `${alert.symbol} hit $${currentPrice.toFixed(2)}`;

      await sendPushToUser(alert.user.id, {
        title: `${alert.symbol} Alert`,
        body: alertBody,
        data: { symbol: alert.symbol, alertId: alert.id },
      });

      if (alert.user.emailAlerts) {
        await sendEmail(
          alert.user.email,
          `${alert.symbol} Alert Triggered`,
          `<p>${alertBody}</p>`
        ).catch((err) => console.error("[cron] Alert email failed:", err));
      }
    }
  }
}
