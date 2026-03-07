import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Stripe from "stripe";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

// ── Fallback hardcoded stocks (used when both sync and FMP are unavailable) ──
const fallbackStocks = [
  { symbol: "NVDA", name: "NVIDIA Corp.", price: 812.4, target: 960, upside: 18, buys: 42, holds: 5, sells: 1, analysts: 48, sector: "Semiconductors", risk: "HIGH" as const, horizon: "12M", region: "us", exchange: "NASDAQ", currency: "USD", dividendYield: 0.03, marketCap: "mega", description: "Leading designer of GPUs for gaming, data centers, and AI workloads.", whyThisPick: "48 analysts cover NVIDIA with near-unanimous buy consensus (87.5%). The average 12-month target of $960 implies 18% upside from current levels.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
  { symbol: "MSFT", name: "Microsoft", price: 426.2, target: 472, upside: 11, buys: 34, holds: 4, sells: 0, analysts: 38, sector: "Software", risk: "LOW" as const, horizon: "12M", region: "us", exchange: "NASDAQ", currency: "USD", dividendYield: 0.72, marketCap: "mega", description: "Enterprise software giant with Azure cloud and AI integration.", whyThisPick: "Zero sell ratings from 38 analysts signal exceptional conviction.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
  { symbol: "AVGO", name: "Broadcom", price: 1288.1, target: 1470, upside: 14, buys: 29, holds: 6, sells: 0, analysts: 35, sector: "Semiconductors", risk: "BALANCED" as const, horizon: "12M", region: "us", exchange: "NASDAQ", currency: "USD", dividendYield: 1.24, marketCap: "mega", description: "Diversified semiconductor company with networking, broadband, and enterprise software.", whyThisPick: "VMware acquisition creates a combined hardware+software platform.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
  { symbol: "AMZN", name: "Amazon", price: 186.4, target: 216.2, upside: 16, buys: 52, holds: 3, sells: 0, analysts: 55, sector: "E-Commerce", risk: "BALANCED" as const, horizon: "12M", region: "us", exchange: "NASDAQ", currency: "USD", dividendYield: 0, marketCap: "mega", description: "E-commerce, cloud computing (AWS), and digital advertising conglomerate.", whyThisPick: "Most-covered stock with 55 analysts and zero sells.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
  { symbol: "LLY", name: "Eli Lilly", price: 742.3, target: 853.6, upside: 15, buys: 22, holds: 5, sells: 1, analysts: 28, sector: "Healthcare", risk: "BALANCED" as const, horizon: "12M", region: "us", exchange: "NYSE", currency: "USD", dividendYield: 0.65, marketCap: "mega", description: "Pharmaceutical company leading in GLP-1, diabetes, and oncology.", whyThisPick: "GLP-1 drug Mounjaro/Zepbound is a generational revenue opportunity.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
  { symbol: "ASML", name: "ASML Holding", price: 684.5, target: 821.4, upside: 20, buys: 28, holds: 4, sells: 0, analysts: 32, sector: "Semiconductors", risk: "BALANCED" as const, horizon: "12M", region: "europe", exchange: "Euronext Amsterdam", currency: "EUR", dividendYield: 0.82, marketCap: "mega", description: "Monopoly supplier of EUV lithography machines for advanced chip manufacturing.", whyThisPick: "ASML is the sole supplier of EUV lithography — every leading-edge chip requires their machines.", belowSma200: false, brokers: ["ibkr", "t212", "etoro"] },
  { symbol: "SAP", name: "SAP SE", price: 218.6, target: 244.8, upside: 12, buys: 22, holds: 8, sells: 1, analysts: 31, sector: "Software", risk: "LOW" as const, horizon: "12M", region: "europe", exchange: "XETRA", currency: "EUR", dividendYield: 1.05, marketCap: "mega", description: "Enterprise resource planning (ERP) software leader migrating to cloud.", whyThisPick: "Cloud transition driving recurring revenue growth of 25%+ YoY.", belowSma200: false, brokers: ["ibkr", "t212", "etoro"] },
  { symbol: "TSM", name: "Taiwan Semiconductor", price: 168.4, target: 200.4, upside: 19, buys: 32, holds: 3, sells: 0, analysts: 35, sector: "Semiconductors", risk: "BALANCED" as const, horizon: "12M", region: "em", exchange: "NYSE (ADR)", currency: "USD", dividendYield: 1.42, marketCap: "mega", description: "World's largest semiconductor foundry.", whyThisPick: "Zero sell ratings. TSMC manufactures the most advanced chips on earth.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
];

// ── ETF type (for sync from prod) ──
type EtfRow = {
  symbol: string; name: string; cagr1y: number; cagr3y: number; cagr5y: number;
  drawdown: number; fee: number; sharpe: number; theme: string; region: string;
  exchange: string; currency: string; description: string; brokers: string[];
};

// ── Upsert helpers ──

async function upsertStocks(stocks: typeof fallbackStocks) {
  for (const s of stocks) {
    const { brokers, ...stockData } = s;
    const stock = await db.stock.upsert({
      where: { symbol: s.symbol },
      update: { ...stockData },
      create: { ...stockData },
    });
    await db.stockBroker.deleteMany({ where: { stockId: stock.id } });
    for (const brokerId of brokers) {
      await db.stockBroker.create({ data: { stockId: stock.id, brokerId } }).catch(() => {});
    }
  }
  return stocks.length;
}

async function upsertEtfs(etfs: EtfRow[]) {
  for (const e of etfs) {
    const { brokers, ...etfData } = e;
    const etf = await db.etf.upsert({
      where: { symbol: e.symbol },
      update: { ...etfData },
      create: { ...etfData },
    });
    await db.etfBroker.deleteMany({ where: { etfId: etf.id } });
    for (const brokerId of brokers) {
      await db.etfBroker.create({ data: { etfId: etf.id, brokerId } }).catch(() => {});
    }
  }
  return etfs.length;
}

// ── Sync from prod (dev mode) ──

async function syncFromProdInline(source: string): Promise<boolean> {
  console.log(`[seed] Syncing stocks from ${source}...`);
  try {
    const res = await fetch(`${source}/api/stocks/export`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.stocks?.length > 0) {
      await upsertStocks(data.stocks);
      console.log(`[seed] Synced ${data.stocks.length} stocks from prod`);
    }
    if (data.etfs?.length > 0) {
      await upsertEtfs(data.etfs);
      console.log(`[seed] Synced ${data.etfs.length} ETFs from prod`);
    }
    return true;
  } catch (err) {
    console.warn("[seed] Prod sync failed, will use fallback:", err);
    return false;
  }
}

async function seedCurrencies() {
  const currencies = [
    { id: "USD", name: "US Dollar", symbol: "$" },
    { id: "EUR", name: "Euro", symbol: "\u20AC" },
    { id: "GBP", name: "British Pound", symbol: "\u00A3" },
    { id: "CHF", name: "Swiss Franc", symbol: "CHF" },
    { id: "CAD", name: "Canadian Dollar", symbol: "CA$" },
    { id: "AUD", name: "Australian Dollar", symbol: "A$" },
    { id: "SEK", name: "Swedish Krona", symbol: "kr" },
    { id: "DKK", name: "Danish Krone", symbol: "kr" },
    { id: "NOK", name: "Norwegian Krone", symbol: "kr" },
    { id: "PLN", name: "Polish Zloty", symbol: "z\u0142" },
    { id: "CZK", name: "Czech Koruna", symbol: "K\u010D" },
    { id: "JPY", name: "Japanese Yen", symbol: "\u00A5" },
  ];

  for (const c of currencies) {
    await db.currency.upsert({
      where: { id: c.id },
      update: { name: c.name, symbol: c.symbol },
      create: c,
    });
  }
  console.log(`Seeded ${currencies.length} currencies`);

  // Default region → currency mappings
  const regionMappings = [
    { region: "GLOBAL" as const, currencyId: "USD" },
    { region: "DE" as const, currencyId: "EUR" },
  ];

  for (const rm of regionMappings) {
    await db.regionCurrency.upsert({
      where: { region_currencyId: { region: rm.region, currencyId: rm.currencyId } },
      update: {},
      create: { region: rm.region, currencyId: rm.currencyId, isDefault: true },
    });
  }
  console.log(`Seeded ${regionMappings.length} region-currency mappings`);
}

async function main() {
  console.log("Seeding database...");

  // ── Currencies (before products) ──
  await seedCurrencies();

  // ── Brokers ──
  const brokerData = [
    { id: "ibkr", name: "Interactive Brokers", logo: "IBKR", fractional: true, commission: "$0 (IBKR Lite)", minDeposit: "$0", features: ["Global market access (150+ markets)", "Advanced tools", "Fractional shares", "Low margin rates"], cta: "Open IBKR Account", regions: ["us", "de"] },
    { id: "t212", name: "Trading 212", logo: "T212", fractional: true, commission: "$0", minDeposit: "$1", features: ["Commission-free", "Fractional shares", "Auto-invest pies", "EU/UK friendly"], cta: "Open Trading 212", regions: ["us", "de"], sparplan: true, sparplanMin: "€1" },
    { id: "robinhood", name: "Robinhood", logo: "HOOD", fractional: true, commission: "$0", minDeposit: "$0", features: ["Commission-free", "Fractional shares", "Options trading", "US stocks only"], cta: "Open Robinhood", regions: ["us"] },
    { id: "etoro", name: "eToro", logo: "ETRO", fractional: true, commission: "$0 (stocks)", minDeposit: "$50", features: ["Social trading", "Copy portfolios", "Multi-asset", "Global access"], cta: "Open eToro Account", regions: ["us", "de"] },
    { id: "fidelity", name: "Fidelity", logo: "FID", fractional: true, commission: "$0", minDeposit: "$0", features: ["Commission-free stocks & ETFs", "Fractional shares", "Excellent research", "No account minimums"], cta: "Open Fidelity Account", regions: ["us"] },
    { id: "schwab", name: "Charles Schwab", logo: "SCHW", fractional: true, commission: "$0", minDeposit: "$0", features: ["Commission-free trading", "Schwab Intelligent Portfolios", "Comprehensive research", "24/7 customer service"], cta: "Open Schwab Account", regions: ["us"] },
    { id: "webull", name: "Webull", logo: "WBLL", fractional: true, commission: "$0", minDeposit: "$0", features: ["Commission-free", "Extended hours trading", "Advanced charting", "Paper trading"], cta: "Open Webull Account", regions: ["us"] },
    { id: "traderepublic", name: "Trade Republic", logo: "TR", fractional: true, commission: "€1 per trade", minDeposit: "€0", features: ["Sparplan from €1/month", "4% interest on cash", "8,500+ stocks & ETFs", "German BaFin regulated"], cta: "Open Trade Republic", regions: ["de"], sparplan: true, sparplanMin: "€1" },
    { id: "scalable", name: "Scalable Capital", logo: "SC", fractional: true, commission: "€0.99 or flat", minDeposit: "€0", features: ["Sparplan from €1/month", "PRIME+ flat-rate trading", "7,800+ stocks & ETFs", "German BaFin regulated"], cta: "Open Scalable Capital", regions: ["de"], sparplan: true, sparplanMin: "€1" },
    { id: "ing", name: "ING", logo: "ING", fractional: false, commission: "€4.90 + 0.25%", minDeposit: "€0", features: ["Full-service banking + brokerage", "Sparplan from €1/month", "Trusted German bank", "Wide ETF selection"], cta: "Open ING Depot", regions: ["de"], sparplan: true, sparplanMin: "€1" },
    { id: "comdirect", name: "comdirect", logo: "CD", fractional: false, commission: "€3.90 + 0.25%", minDeposit: "€0", features: ["Commerzbank subsidiary", "Sparplan from €25/month", "Comprehensive research", "comdirect community"], cta: "Open comdirect Depot", regions: ["de"], sparplan: true, sparplanMin: "€25" },
    { id: "consorsbank", name: "Consorsbank", logo: "CB", fractional: false, commission: "€4.95 + 0.25%", minDeposit: "€0", features: ["BNP Paribas subsidiary", "Sparplan from €10/month", "Wide selection of stocks & ETFs", "German BaFin regulated"], cta: "Open Consorsbank Depot", regions: ["de"], sparplan: true, sparplanMin: "€10" },
    { id: "finanzenzero", name: "finanzen.net zero", logo: "FZ", fractional: true, commission: "€0", minDeposit: "€0", features: ["Commission-free trading", "Sparplan from €1/month", "Over 6,000 stocks & ETFs", "German BaFin regulated"], cta: "Open finanzen.net zero", regions: ["de"], sparplan: true, sparplanMin: "€1" },
  ];

  for (const b of brokerData) {
    await db.broker.upsert({
      where: { id: b.id },
      update: { name: b.name, logo: b.logo, fractional: b.fractional, commission: b.commission, minDeposit: b.minDeposit, features: b.features, cta: b.cta, regions: b.regions, sparplan: b.sparplan ?? false, sparplanMin: b.sparplanMin ?? null },
      create: { id: b.id, name: b.name, logo: b.logo, fractional: b.fractional, commission: b.commission, minDeposit: b.minDeposit, features: b.features, cta: b.cta, regions: b.regions, sparplan: b.sparplan ?? false, sparplanMin: b.sparplanMin ?? null },
    });
  }
  console.log(`Seeded ${brokerData.length} brokers`);

  // ── Stocks & ETFs: try sync → fallback ──
  const syncSource = process.env.STOCK_SYNC_SOURCE;
  let stocksSeeded = false;

  if (syncSource) {
    // DEV: sync from prod
    stocksSeeded = await syncFromProdInline(syncSource);
  }

  if (!stocksSeeded) {
    // PROD or fallback: use hardcoded stocks
    const stockCount = await upsertStocks(fallbackStocks);
    console.log(`Seeded ${stockCount} stocks (fallback)`);
    // ETFs are populated exclusively by scripts/etf-discover.py (real yfinance data)
    console.log(`Skipping ETF seed — run scripts/etf-discover.py for real data`);
  }

  // ── Demo Portfolios ──
  const demoPortfolios = [
    { strategy: "BUY_AND_HOLD" as const, name: "Buy & Hold", description: "Top 5 by conviction score, held for 12 months", initialAmount: 10000, holdings: [{ symbol: "MSFT", weight: 0.2 }, { symbol: "AMZN", weight: 0.2 }, { symbol: "NVDA", weight: 0.2 }, { symbol: "LLY", weight: 0.2 }, { symbol: "AVGO", weight: 0.2 }] },
    { strategy: "ACTIVE_ROTATION" as const, name: "Active Rotation", description: "Monthly rotation to current top 5 stocks", initialAmount: 10000, holdings: [{ symbol: "NVDA", weight: 0.2 }, { symbol: "CRWD", weight: 0.2 }, { symbol: "LULU", weight: 0.2 }, { symbol: "SHOP", weight: 0.2 }, { symbol: "TSM", weight: 0.2 }] },
    { strategy: "DIVIDEND_FOCUS" as const, name: "Dividend Focus", description: "Top 5 dividend-yielding stocks for income", initialAmount: 10000, holdings: [{ symbol: "ALV", weight: 0.2 }, { symbol: "DTE", weight: 0.2 }, { symbol: "MUV2", weight: 0.2 }, { symbol: "MCD", weight: 0.2 }, { symbol: "AVGO", weight: 0.2 }] },
    { strategy: "BALANCED_GROWTH" as const, name: "Balanced Growth", description: "Mix of growth + income stocks with 2 ETFs", initialAmount: 10000, holdings: [{ symbol: "MSFT", weight: 0.15 }, { symbol: "AMZN", weight: 0.15 }, { symbol: "MCD", weight: 0.1 }, { symbol: "ALV", weight: 0.1 }] },
  ];

  for (const dp of demoPortfolios) {
    const portfolio = await db.demoPortfolio.upsert({
      where: { id: dp.strategy },
      update: { name: dp.name, description: dp.description, initialAmount: dp.initialAmount, holdings: dp.holdings },
      create: { id: dp.strategy, strategy: dp.strategy, name: dp.name, description: dp.description, initialAmount: dp.initialAmount, holdings: dp.holdings },
    });

    // Generate 12 months of synthetic snapshots
    const now = new Date();
    const annualizedReturn = { BUY_AND_HOLD: 0.15, ACTIVE_ROTATION: 0.18, DIVIDEND_FOCUS: 0.10, BALANCED_GROWTH: 0.12 }[dp.strategy] ?? 0.12;
    const volatility = { BUY_AND_HOLD: 0.02, ACTIVE_ROTATION: 0.04, DIVIDEND_FOCUS: 0.015, BALANCED_GROWTH: 0.025 }[dp.strategy] ?? 0.02;

    let cumulativeReturn = 0;
    for (let month = 11; month >= 0; month--) {
      const date = new Date(now.getFullYear(), now.getMonth() - month, 1);
      const monthlyReturn = (annualizedReturn / 12) + (Math.random() - 0.5) * volatility;
      cumulativeReturn += monthlyReturn;
      const totalValue = dp.initialAmount * (1 + cumulativeReturn);

      await db.demoPortfolioSnapshot.upsert({
        where: { demoPortfolioId_date: { demoPortfolioId: portfolio.id, date } },
        update: { totalValue, returnPct: cumulativeReturn * 100, holdings: dp.holdings },
        create: { demoPortfolioId: portfolio.id, date, totalValue, returnPct: cumulativeReturn * 100, holdings: dp.holdings },
      });
    }
  }
  console.log(`Seeded ${demoPortfolios.length} demo portfolios with snapshots`);

  // ── Products ──
  await seedProducts();

  // ── Email Templates ──
  await seedEmailTemplates();

  console.log("Seeding complete!");
}

async function seedProducts() {
  const existing = await db.product.count();
  if (existing > 0) {
    console.log(`Skipping product seed — ${existing} products already exist`);
    return;
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.warn("[seed] STRIPE_SECRET_KEY not set — skipping product seed");
    return;
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-01-28.clover" });

  const products = [
    {
      name: "Plus Monthly",
      description: "Full access to all stock picks, ETF rankings, and portfolio tools — billed monthly.",
      features: ["Unlimited stock picks", "Full ETF rankings", "Auto-Mix portfolio builder", "Priority support"],
      type: "SUBSCRIPTION" as const,
      priceAmount: 699,
      currency: "usd",
      billingInterval: "MONTH" as const,
      passType: null,
      passDays: null,
      trialDays: null,
      highlighted: false,
      sortOrder: 0,
    },
    {
      name: "Plus Annual",
      description: "Full access to all stock picks, ETF rankings, and portfolio tools — billed annually. Save 40%!",
      features: ["Unlimited stock picks", "Full ETF rankings", "Auto-Mix portfolio builder", "Priority support"],
      type: "SUBSCRIPTION" as const,
      priceAmount: 4999,
      currency: "usd",
      billingInterval: "YEAR" as const,
      passType: null,
      passDays: null,
      trialDays: null,
      highlighted: true,
      sortOrder: 1,
    },
    {
      name: "1-Day Pass",
      description: "24 hours of full Plus access. Use it when you need it.",
      features: null,
      type: "PASS" as const,
      priceAmount: 299,
      currency: "usd",
      billingInterval: null,
      passType: "ONE_DAY" as const,
      passDays: 1,
      trialDays: null,
      highlighted: false,
      sortOrder: 10,
    },
    {
      name: "3-Day Pass",
      description: "3 separate 24-hour activations of full Plus access.",
      features: null,
      type: "PASS" as const,
      priceAmount: 599,
      currency: "usd",
      billingInterval: null,
      passType: "THREE_DAY" as const,
      passDays: 3,
      trialDays: null,
      highlighted: false,
      sortOrder: 11,
    },
    {
      name: "12-Day Pass",
      description: "12 separate 24-hour activations of full Plus access. Best per-day value.",
      features: null,
      type: "PASS" as const,
      priceAmount: 1499,
      currency: "usd",
      billingInterval: null,
      passType: "TWELVE_DAY" as const,
      passDays: 12,
      trialDays: null,
      highlighted: true,
      sortOrder: 12,
    },
  ];

  for (const p of products) {
    // Create Stripe product + price
    const stripeProduct = await stripe.products.create({ name: p.name, description: p.description });

    const priceParams: Stripe.PriceCreateParams = {
      product: stripeProduct.id,
      unit_amount: p.priceAmount,
      currency: p.currency,
    };

    if (p.type === "SUBSCRIPTION" && p.billingInterval) {
      priceParams.recurring = {
        interval: p.billingInterval === "MONTH" ? "month" : "year",
      };
    }

    const stripePrice = await stripe.prices.create(priceParams);

    // Insert into DB
    await db.product.create({
      data: {
        name: p.name,
        description: p.description,
        features: p.features ?? undefined,
        type: p.type,
        priceAmount: p.priceAmount,
        currency: p.currency,
        billingInterval: p.billingInterval,
        passType: p.passType,
        passDays: p.passDays,
        trialDays: p.trialDays,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        highlighted: p.highlighted,
        sortOrder: p.sortOrder,
      },
    });

    console.log(`  Created product: ${p.name} (${stripePrice.id})`);
  }

  console.log(`Seeded ${products.length} products in Stripe + DB`);
}

async function seedEmailTemplates() {
  const templates = [
    {
      slug: "verification",
      name: "Email Verification",
      subject: "Verify your email",
      body: `<h1>Verify your email</h1>
    <p>Hi {{userName}},</p>
    <p>Thanks for creating your Bonistock account. Click the button below to verify your email address.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="{{verifyUrl}}" class="btn">Verify Email</a>
    </p>
    <p>This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>`,
    },
    {
      slug: "passwordReset",
      name: "Password Reset",
      subject: "Reset your password",
      body: `<h1>Reset your password</h1>
    <p>Hi {{userName}},</p>
    <p>We received a request to reset your password. Click the button below to set a new one.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="{{resetUrl}}" class="btn">Reset Password</a>
    </p>
    <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
    },
    {
      slug: "welcome",
      name: "Welcome",
      subject: "Welcome to Bonistock!",
      body: `<h1>Welcome to Bonistock!</h1>
    <p>Hi {{userName}},</p>
    <p>Your account is set up and ready to go. Start exploring analyst-backed stock picks and build your first portfolio.</p>
    <p>Here's what you can do:</p>
    <ul style="color: #a3a3a3; font-size: 14px; line-height: 2;">
      <li>Browse top upside stocks ranked by analyst consensus</li>
      <li>Use Auto-Mix to build a diversified portfolio in seconds</li>
      <li>Compare brokers and find the best fit for your region</li>
    </ul>`,
    },
    {
      slug: "passConfirmation",
      name: "Pass Confirmation",
      subject: "Your pass is ready!",
      body: `<h1>Your pass is ready!</h1>
    <p>Hi {{userName}},</p>
    <p>Your <strong>{{passType}}</strong> has been activated with <strong>{{activations}}</strong> activation(s).</p>
    <p>Each activation gives you 24 hours of full Plus access. Activate from your dashboard whenever you're ready.</p>`,
    },
    {
      slug: "subscriptionConfirmation",
      name: "Subscription Confirmed",
      subject: "Subscription confirmed",
      body: `<h1>Subscription confirmed</h1>
    <p>Hi {{userName}},</p>
    <p>Your <strong>{{tier}}</strong> subscription is now active at <strong>{{amount}}</strong>.</p>
    <p>You now have full access to all Bonistock features. Enjoy!</p>`,
    },
    {
      slug: "subscriptionCanceled",
      name: "Subscription Canceled",
      subject: "Subscription canceled",
      body: `<h1>Subscription canceled</h1>
    <p>Hi {{userName}},</p>
    <p>Your subscription has been canceled. You'll continue to have access until <strong>{{endDate}}</strong>.</p>
    <p>You can resubscribe anytime from your account settings.</p>`,
    },
    {
      slug: "emailChange",
      name: "Email Change",
      subject: "Confirm your new email",
      body: `<h1>Confirm your new email</h1>
    <p>Hi {{userName}},</p>
    <p>You requested to change your Bonistock email to <strong>{{newEmail}}</strong>. Click the button below to confirm this change.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="{{confirmUrl}}" class="btn">Confirm Email Change</a>
    </p>
    <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
    },
    {
      slug: "paymentFailed",
      name: "Payment Failed",
      subject: "Payment failed",
      body: `<h1>Payment failed</h1>
    <p>Hi {{userName}},</p>
    <p>We couldn't process your latest payment. Please update your payment method to continue your subscription.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="{{settingsUrl}}" class="btn">Update Payment</a>
    </p>`,
    },
    {
      slug: "accountDeletion",
      name: "Account Deleted",
      subject: "Your account has been deleted",
      body: `<h1>Account deleted</h1>
    <p>Hi {{userName}},</p>
    <p>Your Bonistock account has been successfully deleted. All your personal data has been anonymized.</p>
    <p>If you change your mind, you're welcome to create a new account anytime.</p>`,
    },
    {
      slug: "accountDeletionWithSubscription",
      name: "Account Deleted with Subscription",
      subject: "Your account has been deleted & subscription canceled",
      body: `<h1>Account deleted &amp; subscription canceled</h1>
    <p>Hi {{userName}},</p>
    <p>Your Bonistock account has been successfully deleted. All your personal data has been anonymized and your <strong>{{tier}}</strong> subscription has been canceled.</p>
    <p>{{cancelNote}}</p>
    <p>If you change your mind, you're welcome to create a new account anytime — but please note that your previous subscription and data cannot be restored.</p>`,
    },
    {
      slug: "invoice",
      name: "Invoice",
      subject: "Invoice #{{invoiceNumber}}",
      body: `<h1>Your invoice</h1>
    <p>Hi {{userName}},</p>
    <p>Your payment of <strong>{{amount}}</strong> has been received. Invoice <strong>#{{invoiceNumber}}</strong> is ready.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="{{invoiceUrl}}" class="btn">View Invoice</a>
    </p>
    <p>You can view, download, or print your invoice from the link above.</p>`,
    },
  ];

  for (const t of templates) {
    await db.emailTemplate.upsert({
      where: { slug: t.slug },
      update: {},
      create: t,
    });
  }
  console.log(`Seeded ${templates.length} email templates`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
