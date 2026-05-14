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
  const portfolios = await db.demoPortfolio.findMany();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Collect all stock symbols across all portfolios for bulk fetches
  type Holding = { symbol: string; weight: number; assetType: string };
  const allSymbols = new Set<string>();
  for (const portfolio of portfolios) {
    const holdings = portfolio.holdings as Holding[];
    for (const h of holdings ?? []) {
      if (h.assetType === "STOCK" || !h.assetType) allSymbols.add(h.symbol);
    }
  }

  if (allSymbols.size === 0) return;

  const symbolList = [...allSymbols];

  // Today's prices from Stock table (updated by discover.py)
  const todayStocks = await db.stock.findMany({
    where: { symbol: { in: symbolList } },
    select: { symbol: true, price: true },
  });
  const todayMap = new Map(todayStocks.map((s) => [s.symbol, s.price]));

  // Per-symbol baseline: each symbol's earliest ever StockSnapshot price.
  // This matches how the seed builds the series (per-symbol first-recorded price),
  // so cron-added snapshots are consistent with the seed-created history.
  const baselineRows = await db.stockSnapshot.findMany({
    where: { symbol: { in: symbolList } },
    orderBy: { date: "asc" },
    distinct: ["symbol"],
    select: { symbol: true, price: true },
  });
  const baselineMap = new Map(baselineRows.map((s) => [s.symbol, s.price]));

  for (const portfolio of portfolios) {
    // Skip if today's snapshot already exists
    const existing = await db.demoPortfolioSnapshot.findFirst({
      where: { demoPortfolioId: portfolio.id, date: today },
    });
    if (existing) continue;

    const holdings = (portfolio.holdings as Holding[]) ?? [];
    const stockHoldings = holdings.filter((h) => h.assetType === "STOCK" || !h.assetType);
    if (stockHoldings.length === 0) continue;

    let weightedReturn = 0;
    let coveredWeight = 0;
    for (const h of stockHoldings) {
      const basePrice = baselineMap.get(h.symbol);
      const curPrice = todayMap.get(h.symbol);
      if (!basePrice || !curPrice || basePrice === 0) continue;
      weightedReturn += (h.weight / 100) * ((curPrice / basePrice - 1) * 100);
      coveredWeight += h.weight;
    }

    if (coveredWeight === 0) continue;

    // Normalize to covered weight so partial symbol coverage doesn't bias toward 0
    const returnPct = (weightedReturn / coveredWeight) * 100;
    const totalValue = 100 * (1 + returnPct / 100);

    await db.demoPortfolioSnapshot.create({
      data: {
        demoPortfolioId: portfolio.id,
        date: today,
        totalValue: parseFloat(totalValue.toFixed(4)),
        returnPct: parseFloat(returnPct.toFixed(4)),
        holdings: portfolio.holdings as object,
      },
    });

    console.log(`  [cron] ${portfolio.name}: returnPct=${returnPct.toFixed(2)}%, coveredWeight=${coveredWeight.toFixed(1)}`);
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
