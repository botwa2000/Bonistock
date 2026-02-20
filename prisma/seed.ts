import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

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
  ];

  for (const b of brokerData) {
    await db.broker.upsert({
      where: { id: b.id },
      update: { name: b.name, logo: b.logo, fractional: b.fractional, commission: b.commission, minDeposit: b.minDeposit, features: b.features, cta: b.cta, regions: b.regions, sparplan: b.sparplan ?? false, sparplanMin: b.sparplanMin ?? null },
      create: { id: b.id, name: b.name, logo: b.logo, fractional: b.fractional, commission: b.commission, minDeposit: b.minDeposit, features: b.features, cta: b.cta, regions: b.regions, sparplan: b.sparplan ?? false, sparplanMin: b.sparplanMin ?? null },
    });
  }
  console.log(`Seeded ${brokerData.length} brokers`);

  // ── Stocks ──
  const stocks = [
    { symbol: "NVDA", name: "NVIDIA Corp.", price: 812.4, target: 960, upside: 18, buys: 42, holds: 5, sells: 1, analysts: 48, sector: "Semiconductors", risk: "HIGH" as const, horizon: "12M", region: "us", exchange: "NASDAQ", currency: "USD", dividendYield: 0.03, marketCap: "mega", description: "Leading designer of GPUs for gaming, data centers, and AI workloads.", whyThisPick: "48 analysts cover NVIDIA with near-unanimous buy consensus (87.5%). The average 12-month target of $960 implies 18% upside from current levels. AI infrastructure spending continues to accelerate, and NVIDIA holds >80% market share in data center GPUs.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
    { symbol: "MSFT", name: "Microsoft", price: 426.2, target: 472, upside: 11, buys: 34, holds: 4, sells: 0, analysts: 38, sector: "Software", risk: "LOW" as const, horizon: "12M", region: "us", exchange: "NASDAQ", currency: "USD", dividendYield: 0.72, marketCap: "mega", description: "Enterprise software giant with Azure cloud and AI integration.", whyThisPick: "Zero sell ratings from 38 analysts signal exceptional conviction. Azure cloud growth re-accelerated with AI workloads. The Copilot suite is driving incremental revenue across Office 365. Low-risk, steady compounder.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
    { symbol: "AVGO", name: "Broadcom", price: 1288.1, target: 1470, upside: 14, buys: 29, holds: 6, sells: 0, analysts: 35, sector: "Semiconductors", risk: "BALANCED" as const, horizon: "12M", region: "us", exchange: "NASDAQ", currency: "USD", dividendYield: 1.24, marketCap: "mega", description: "Diversified semiconductor company with networking, broadband, and enterprise software.", whyThisPick: "VMware acquisition creates a combined hardware+software platform. Custom AI accelerator business (XPU) growing rapidly with hyperscaler customers. Strong free cash flow funds a growing dividend.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
    { symbol: "LULU", name: "Lululemon Athletica", price: 426.5, target: 520, upside: 22, buys: 21, holds: 8, sells: 2, analysts: 31, sector: "Consumer", risk: "BALANCED" as const, horizon: "12M", region: "us", exchange: "NASDAQ", currency: "USD", dividendYield: 0, marketCap: "large", description: "Premium athletic apparel brand with strong DTC presence.", whyThisPick: "Highest upside in the list at 22%. International expansion (especially China) is an untapped growth lever. Brand loyalty drives repeat purchase rates above 90%.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood"] },
    { symbol: "SHOP", name: "Shopify", price: 88.6, target: 105.4, upside: 19, buys: 28, holds: 10, sells: 3, analysts: 41, sector: "E-Commerce", risk: "HIGH" as const, horizon: "12M", region: "us", exchange: "NYSE", currency: "USD", dividendYield: 0, marketCap: "large", description: "E-commerce platform powering online stores and retail POS systems.", whyThisPick: "Post-logistics divestiture, Shopify is now a lean, high-margin SaaS platform. Merchant solutions revenue growing 25%+ YoY.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
    { symbol: "MCD", name: "McDonald's", price: 291.2, target: 318.0, upside: 9, buys: 26, holds: 9, sells: 0, analysts: 35, sector: "Consumer", risk: "LOW" as const, horizon: "12M", region: "us", exchange: "NYSE", currency: "USD", dividendYield: 2.31, marketCap: "mega", description: "Global fast-food franchise operator and real estate company.", whyThisPick: "Zero sell ratings from 35 analysts. McDonald's is a defensive play with a franchise-heavy model generating consistent cash flow.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
    { symbol: "AMZN", name: "Amazon", price: 186.4, target: 216.2, upside: 16, buys: 52, holds: 3, sells: 0, analysts: 55, sector: "E-Commerce", risk: "BALANCED" as const, horizon: "12M", region: "us", exchange: "NASDAQ", currency: "USD", dividendYield: 0, marketCap: "mega", description: "E-commerce, cloud computing (AWS), and digital advertising conglomerate.", whyThisPick: "Most-covered stock in our universe with 55 analysts and zero sells. AWS margin expansion, advertising revenue growth, and retail efficiency gains create a triple tailwind.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
    { symbol: "CRWD", name: "CrowdStrike", price: 312.8, target: 378.5, upside: 21, buys: 38, holds: 7, sells: 1, analysts: 46, sector: "Cybersecurity", risk: "HIGH" as const, horizon: "12M", region: "us", exchange: "NASDAQ", currency: "USD", dividendYield: 0, marketCap: "large", description: "Cloud-native endpoint security and threat intelligence platform.", whyThisPick: "21% upside with strong conviction (82% buy). The Falcon platform's module adoption is expanding ARR per customer.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
    { symbol: "LLY", name: "Eli Lilly", price: 742.3, target: 853.6, upside: 15, buys: 22, holds: 5, sells: 1, analysts: 28, sector: "Healthcare", risk: "BALANCED" as const, horizon: "12M", region: "us", exchange: "NYSE", currency: "USD", dividendYield: 0.65, marketCap: "mega", description: "Pharmaceutical company leading in GLP-1, diabetes, and oncology.", whyThisPick: "GLP-1 drug Mounjaro/Zepbound is a generational revenue opportunity with $50B+ peak sales potential.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
    { symbol: "INTC", name: "Intel Corp.", price: 31.2, target: 39.9, upside: 28, buys: 8, holds: 22, sells: 10, analysts: 40, sector: "Semiconductors", risk: "HIGH" as const, horizon: "12M", region: "us", exchange: "NASDAQ", currency: "USD", dividendYield: 1.6, marketCap: "large", description: "Legacy chipmaker undergoing foundry transformation.", whyThisPick: "High upside (28%) but low conviction — only 20% buy ratings. Foundry turnaround is a multi-year bet.", belowSma200: true, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
    { symbol: "ASML", name: "ASML Holding", price: 684.5, target: 821.4, upside: 20, buys: 28, holds: 4, sells: 0, analysts: 32, sector: "Semiconductors", risk: "BALANCED" as const, horizon: "12M", region: "europe", exchange: "Euronext Amsterdam", currency: "EUR", dividendYield: 0.82, marketCap: "mega", description: "Monopoly supplier of EUV lithography machines for advanced chip manufacturing.", whyThisPick: "ASML is the sole supplier of EUV lithography — every leading-edge chip on earth requires their machines. 87% buy ratings.", belowSma200: false, brokers: ["ibkr", "t212", "etoro"] },
    { symbol: "NOVO-B", name: "Novo Nordisk", price: 742.8, target: 869.1, upside: 17, buys: 20, holds: 6, sells: 2, analysts: 28, sector: "Healthcare", risk: "BALANCED" as const, horizon: "12M", region: "europe", exchange: "Copenhagen", currency: "DKK", dividendYield: 1.15, marketCap: "mega", description: "Global leader in GLP-1 diabetes and obesity treatments (Ozempic, Wegovy).", whyThisPick: "GLP-1 market leader with Ozempic/Wegovy generating $30B+ in annual revenue.", belowSma200: false, brokers: ["ibkr", "t212", "etoro"] },
    { symbol: "SAP", name: "SAP SE", price: 218.6, target: 244.8, upside: 12, buys: 22, holds: 8, sells: 1, analysts: 31, sector: "Software", risk: "LOW" as const, horizon: "12M", region: "europe", exchange: "XETRA", currency: "EUR", dividendYield: 1.05, marketCap: "mega", description: "Enterprise resource planning (ERP) software leader migrating to cloud.", whyThisPick: "Cloud transition driving recurring revenue growth of 25%+ YoY.", belowSma200: false, brokers: ["ibkr", "t212", "etoro"] },
    { symbol: "SIE", name: "Siemens AG", price: 192.4, target: 219.3, upside: 14, buys: 18, holds: 7, sells: 1, analysts: 26, sector: "Industrials", risk: "BALANCED" as const, horizon: "12M", region: "europe", exchange: "XETRA", currency: "EUR", dividendYield: 2.2, marketCap: "mega", description: "German industrial conglomerate with digital industries, smart infrastructure, and mobility.", whyThisPick: "Siemens is Europe's largest industrial technology company.", belowSma200: false, brokers: ["ibkr", "traderepublic", "scalable", "ing", "comdirect"] },
    { symbol: "ALV", name: "Allianz SE", price: 284.6, target: 315.9, upside: 11, buys: 16, holds: 6, sells: 0, analysts: 22, sector: "Insurance", risk: "LOW" as const, horizon: "12M", region: "europe", exchange: "XETRA", currency: "EUR", dividendYield: 4.1, marketCap: "mega", description: "Europe's largest insurance and asset management group (PIMCO).", whyThisPick: "Zero sell ratings from 22 analysts. High dividend yield of 4.1%.", belowSma200: false, brokers: ["ibkr", "traderepublic", "scalable", "ing", "comdirect"] },
    { symbol: "DTE", name: "Deutsche Telekom", price: 26.8, target: 30.8, upside: 15, buys: 20, holds: 4, sells: 1, analysts: 25, sector: "Telecom", risk: "LOW" as const, horizon: "12M", region: "europe", exchange: "XETRA", currency: "EUR", dividendYield: 3.4, marketCap: "mega", description: "Europe's largest telecom, majority owner of T-Mobile US.", whyThisPick: "T-Mobile US drives the growth story.", belowSma200: false, brokers: ["ibkr", "traderepublic", "scalable", "ing", "comdirect"] },
    { symbol: "IFX", name: "Infineon Technologies", price: 34.2, target: 42.4, upside: 24, buys: 22, holds: 5, sells: 2, analysts: 29, sector: "Semiconductors", risk: "HIGH" as const, horizon: "12M", region: "europe", exchange: "XETRA", currency: "EUR", dividendYield: 0.9, marketCap: "large", description: "German chipmaker focused on automotive, industrial, and power semiconductors.", whyThisPick: "EV adoption and industrial automation drive demand for Infineon's power semiconductors. 24% upside.", belowSma200: false, brokers: ["ibkr", "t212", "traderepublic", "scalable"] },
    { symbol: "MUV2", name: "Munich Re", price: 468.2, target: 515.0, upside: 10, buys: 14, holds: 8, sells: 1, analysts: 23, sector: "Insurance", risk: "LOW" as const, horizon: "12M", region: "europe", exchange: "XETRA", currency: "EUR", dividendYield: 3.2, marketCap: "mega", description: "World's largest reinsurer with consistent profitability.", whyThisPick: "Munich Re is the global reinsurance leader with pricing power in a hardening market.", belowSma200: false, brokers: ["ibkr", "traderepublic", "scalable", "ing", "comdirect"] },
    { symbol: "RHM", name: "Rheinmetall", price: 582.4, target: 693.1, upside: 19, buys: 12, holds: 3, sells: 0, analysts: 15, sector: "Defense", risk: "HIGH" as const, horizon: "12M", region: "europe", exchange: "XETRA", currency: "EUR", dividendYield: 0.8, marketCap: "large", description: "Germany's leading defense and automotive supplier.", whyThisPick: "European defense spending surge driven by NATO 2% GDP targets. Zero sell ratings.", belowSma200: false, brokers: ["ibkr", "t212", "traderepublic", "scalable"] },
    { symbol: "TSM", name: "Taiwan Semiconductor", price: 168.4, target: 200.4, upside: 19, buys: 32, holds: 3, sells: 0, analysts: 35, sector: "Semiconductors", risk: "BALANCED" as const, horizon: "12M", region: "em", exchange: "NYSE (ADR)", currency: "USD", dividendYield: 1.42, marketCap: "mega", description: "World's largest semiconductor foundry.", whyThisPick: "Zero sell ratings. TSMC manufactures the most advanced chips on earth.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood", "etoro"] },
    { symbol: "BABA", name: "Alibaba Group", price: 92.3, target: 121.8, upside: 32, buys: 24, holds: 8, sells: 4, analysts: 36, sector: "E-Commerce", risk: "HIGH" as const, horizon: "12M", region: "em", exchange: "NYSE (ADR)", currency: "USD", dividendYield: 1.8, marketCap: "large", description: "Chinese e-commerce and cloud giant with AI investments.", whyThisPick: "Highest raw upside at 32%, but conviction is mixed. China regulatory risk is the key overhang.", belowSma200: false, brokers: ["ibkr", "t212", "etoro"] },
    { symbol: "MELI", name: "MercadoLibre", price: 1642.0, target: 1904.7, upside: 16, buys: 18, holds: 3, sells: 0, analysts: 21, sector: "E-Commerce", risk: "HIGH" as const, horizon: "12M", region: "em", exchange: "NASDAQ", currency: "USD", dividendYield: 0, marketCap: "large", description: "Latin America's largest e-commerce and fintech platform.", whyThisPick: "Zero sell ratings from 21 analysts. Dominant e-commerce + fintech position in LatAm.", belowSma200: false, brokers: ["ibkr", "t212", "robinhood"] },
  ];

  for (const s of stocks) {
    const { brokers, ...stockData } = s;
    const stock = await db.stock.upsert({
      where: { symbol: s.symbol },
      update: { ...stockData },
      create: { ...stockData },
    });
    // Set broker availability
    await db.stockBroker.deleteMany({ where: { stockId: stock.id } });
    for (const brokerId of brokers) {
      await db.stockBroker.create({ data: { stockId: stock.id, brokerId } });
    }
  }
  console.log(`Seeded ${stocks.length} stocks`);

  // ── ETFs ──
  const etfs = [
    { symbol: "VTI", name: "Vanguard Total Stock Market", cagr1y: 14.2, cagr3y: 9.8, cagr5y: 11.2, drawdown: -33, fee: 0.03, sharpe: 0.78, theme: "Core US Market", region: "us", exchange: "NYSE Arca", currency: "USD", description: "Tracks the entire US equity market.", brokers: ["ibkr", "t212", "robinhood", "etoro"] },
    { symbol: "QQQM", name: "Invesco NASDAQ 100", cagr1y: 22.1, cagr3y: 14.3, cagr5y: 16.1, drawdown: -35, fee: 0.15, sharpe: 0.95, theme: "Growth / Tech", region: "us", exchange: "NASDAQ", currency: "USD", description: "Concentrated exposure to the 100 largest non-financial NASDAQ stocks.", brokers: ["ibkr", "t212", "robinhood", "etoro"] },
    { symbol: "SCHD", name: "Schwab US Dividend Equity", cagr1y: 8.6, cagr3y: 7.2, cagr5y: 10.4, drawdown: -26, fee: 0.06, sharpe: 0.82, theme: "Income / Dividends", region: "us", exchange: "NYSE Arca", currency: "USD", description: "Focuses on high-quality dividend-paying US stocks.", brokers: ["ibkr", "t212", "robinhood"] },
    { symbol: "VXUS", name: "Vanguard Total International", cagr1y: 5.8, cagr3y: 4.1, cagr5y: 6.1, drawdown: -37, fee: 0.07, sharpe: 0.55, theme: "International", region: "global", exchange: "NYSE Arca", currency: "USD", description: "Broad international equity exposure outside the US.", brokers: ["ibkr", "t212", "robinhood", "etoro"] },
    { symbol: "BND", name: "Vanguard Total Bond Market", cagr1y: 3.2, cagr3y: -0.8, cagr5y: 1.1, drawdown: -18, fee: 0.03, sharpe: 0.31, theme: "Bonds / Stability", region: "us", exchange: "NYSE Arca", currency: "USD", description: "US investment-grade bond exposure.", brokers: ["ibkr", "t212", "robinhood"] },
    { symbol: "VGT", name: "Vanguard Information Technology", cagr1y: 25.3, cagr3y: 16.8, cagr5y: 19.4, drawdown: -34, fee: 0.1, sharpe: 0.92, theme: "Technology Sector", region: "us", exchange: "NYSE Arca", currency: "USD", description: "Pure technology sector exposure.", brokers: ["ibkr", "t212", "robinhood", "etoro"] },
    { symbol: "VWCE", name: "Vanguard FTSE All-World (Acc)", cagr1y: 12.1, cagr3y: 8.4, cagr5y: 10.2, drawdown: -34, fee: 0.22, sharpe: 0.72, theme: "Core Global Market", region: "global", exchange: "Euronext Amsterdam", currency: "EUR", description: "UCITS-compliant all-world equity ETF popular with European investors.", brokers: ["ibkr", "t212", "etoro"] },
    { symbol: "EIMI", name: "iShares Core MSCI EM IMI", cagr1y: 4.2, cagr3y: 1.8, cagr5y: 4.6, drawdown: -38, fee: 0.18, sharpe: 0.42, theme: "Emerging Markets", region: "em", exchange: "London", currency: "GBP", description: "Broad emerging market exposure.", brokers: ["ibkr", "t212"] },
    { symbol: "CSPX", name: "iShares Core S&P 500 (Acc)", cagr1y: 15.8, cagr3y: 11.2, cagr5y: 12.9, drawdown: -33, fee: 0.07, sharpe: 0.85, theme: "Core US Large Cap", region: "us", exchange: "London", currency: "USD", description: "UCITS-compliant S&P 500 tracker, accumulating.", brokers: ["ibkr", "t212", "etoro"] },
    { symbol: "IWDA", name: "iShares MSCI World (Acc)", cagr1y: 13.4, cagr3y: 9.6, cagr5y: 11.0, drawdown: -34, fee: 0.2, sharpe: 0.76, theme: "Core Global Market", region: "global", exchange: "XETRA", currency: "EUR", description: "The most popular UCITS ETF for German Sparplan investors.", brokers: ["ibkr", "t212", "traderepublic", "scalable"] },
    { symbol: "XDWD", name: "Xtrackers MSCI World (Acc)", cagr1y: 13.2, cagr3y: 9.4, cagr5y: 10.8, drawdown: -34, fee: 0.19, sharpe: 0.75, theme: "Core Global Market", region: "global", exchange: "XETRA", currency: "EUR", description: "DWS/Xtrackers alternative to iShares MSCI World.", brokers: ["ibkr", "t212", "traderepublic", "scalable"] },
    { symbol: "ISAC", name: "iShares MSCI ACWI (Acc)", cagr1y: 11.8, cagr3y: 8.1, cagr5y: 9.6, drawdown: -35, fee: 0.2, sharpe: 0.7, theme: "Core Global Market", region: "global", exchange: "XETRA", currency: "EUR", description: "All-Country World Index including emerging markets.", brokers: ["ibkr", "t212", "traderepublic", "scalable"] },
    { symbol: "DBXD", name: "Xtrackers DAX (Acc)", cagr1y: 16.2, cagr3y: 8.8, cagr5y: 9.1, drawdown: -40, fee: 0.09, sharpe: 0.62, theme: "Germany / DAX", region: "europe", exchange: "XETRA", currency: "EUR", description: "Tracks the DAX 40.", brokers: ["ibkr", "traderepublic", "scalable", "ing", "comdirect"] },
  ];

  for (const e of etfs) {
    const { brokers, ...etfData } = e;
    const etf = await db.etf.upsert({
      where: { symbol: e.symbol },
      update: { ...etfData },
      create: { ...etfData },
    });
    await db.etfBroker.deleteMany({ where: { etfId: etf.id } });
    for (const brokerId of brokers) {
      await db.etfBroker.create({ data: { etfId: etf.id, brokerId } });
    }
  }
  console.log(`Seeded ${etfs.length} ETFs`);

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

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
