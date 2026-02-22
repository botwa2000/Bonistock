import { z } from "zod";

const DAILY_LIMIT = 250;
let requestCount = 0;
let lastResetDate = new Date().toDateString();

function getApiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("Missing required env var: FMP_API_KEY");
  return key;
}

function checkRateLimit(): void {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    requestCount = 0;
    lastResetDate = today;
  }
  if (requestCount >= DAILY_LIMIT) {
    throw new Error("FMP daily rate limit reached (250 requests/day)");
  }
  requestCount++;
}

async function fmpFetch<T>(path: string, schema: z.ZodSchema<T>, extraParams?: Record<string, string>): Promise<T> {
  checkRateLimit();
  const params = new URLSearchParams({ apikey: getApiKey(), ...extraParams });
  const url = `https://financialmodelingprep.com/stable${path}?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FMP API error: ${res.status} ${res.statusText} (${path})`);
  }
  const data = await res.json();
  return schema.parse(data);
}

// ── Quote ──

const quoteSchema = z.array(z.object({
  symbol: z.string(),
  name: z.string().optional().default(""),
  price: z.number(),
  changePercentage: z.number().optional(),
  marketCap: z.number().optional(),
  priceAvg200: z.number().optional(),
  exchange: z.string().optional().default(""),
}));

export async function fetchStockQuote(symbol: string) {
  const data = await fmpFetch("/quote", quoteSchema, { symbol });
  return data[0] ?? null;
}

// ── Profile ──

const profileSchema = z.array(z.object({
  symbol: z.string(),
  companyName: z.string(),
  sector: z.string(),
  marketCap: z.number(),
  description: z.string(),
  currency: z.string(),
  exchange: z.string(),
}));

export async function fetchStockProfile(symbol: string) {
  const data = await fmpFetch("/profile", profileSchema, { symbol });
  return data[0] ?? null;
}

// ── Price Target Consensus ──

const priceTargetSchema = z.array(z.object({
  symbol: z.string(),
  targetHigh: z.number(),
  targetLow: z.number(),
  targetConsensus: z.number(),
  targetMedian: z.number(),
}));

export async function fetchPriceTarget(symbol: string) {
  const data = await fmpFetch("/price-target-consensus", priceTargetSchema, { symbol });
  return data[0] ?? null;
}

// ── Batch Quotes (individual calls, multi-symbol restricted on current plan) ──

export async function fetchBatchQuotes(symbols: string[]) {
  const results: Array<{ symbol: string; price: number; changePercentage?: number; priceAvg200?: number; marketCap?: number; exchange?: string; name?: string }> = [];
  for (const symbol of symbols) {
    if (getRemainingRequests() < 10) break;
    try {
      const quote = await fetchStockQuote(symbol);
      if (quote) results.push(quote);
    } catch {
      // skip individual failures
    }
  }
  return results;
}

// ── Analyst Consensus (grades endpoint) ──

const gradeSchema = z.array(z.object({
  symbol: z.string().optional(),
  date: z.string().optional(),
  gradingCompany: z.string().optional(),
  previousGrade: z.string().optional(),
  newGrade: z.string().optional(),
}));

export async function fetchAnalystConsensus(symbol: string) {
  checkRateLimit();
  const params = new URLSearchParams({ symbol, limit: "100", apikey: getApiKey() });
  const url = `https://financialmodelingprep.com/stable/grades?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP grade error: ${res.status}`);
  const raw = await res.json();
  const grades = gradeSchema.parse(raw);

  let strongBuy = 0, buy = 0, hold = 0, sell = 0;
  for (const g of grades) {
    const grade = (g.newGrade ?? "").toLowerCase();
    if (grade.includes("strong buy") || grade.includes("outperform")) strongBuy++;
    else if (grade.includes("buy") || grade.includes("overweight")) buy++;
    else if (grade.includes("hold") || grade.includes("neutral") || grade.includes("equal")) hold++;
    else if (grade.includes("sell") || grade.includes("underperform") || grade.includes("underweight")) sell++;
  }
  return { strongBuy, buy, hold, sell, total: strongBuy + buy + hold + sell };
}

// ── Stock Universe (replaces screener, which is restricted on current FMP plan) ──
// Curated list of ~200 liquid stocks across market caps and regions.
// Expand this list as needed; no API call required.

const STOCK_UNIVERSE = [
  // ── US Mega / Large caps ──
  "AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","BRK-B","JPM","V",
  "UNH","XOM","JNJ","MA","PG","HD","COST","ABBV","MRK","CVX",
  "LLY","AVGO","KO","PEP","ADBE","CRM","WMT","BAC","NFLX","AMD",
  "TMO","MCD","CSCO","DIS","ABT","INTC","QCOM","CMCSA","TXN","PM",
  "HON","NEE","LOW","UNP","AMGN","IBM","GE","CAT","BA","ISRG",
  "SYK","AXP","GS","MDLZ","PLD","BLK","GILD","ADI","PANW","LRCX",
  "KLAC","MMC","SCHW","CB","ANET","SNPS","CDNS","VRTX","REGN","MU",
  "NOW","UBER","ABNB","SPOT","DASH","COIN","SQ","PLTR","CRWD","SNOW",
  "ZS","NET","DDOG","MRVL","ON","ARM","SMCI","ASML","TSM",
  // ── US Mid caps ──
  "HUBS","TTD","BILL","PCOR","SAMSARA","ZI","CFLT","MDB","ESTC","OKTA",
  "TWLO","GTLB","DKNG","RIVN","LCID","SOFI","HOOD","RBLX","U","PATH",
  "APP","CELH","CART","BIRK","DUOL","CAVA","TOST","DOCS","SMMT","EXAS",
  // ── US Energy / Industrials ──
  "COP","EOG","SLB","PXD","DVN","MPC","PSX","VLO","OXY","HAL",
  "LMT","RTX","NOC","GD","HII","TDG","WM","RSG",
  // ── US Healthcare ──
  "PFE","BMY","MRNA","ZTS","CI","ELV","HCA","DXCM","IDXX","IQV",
  // ── US Financial / RE ──
  "MS","C","USB","PNC","TFC","SPGI","ICE","CME","AMT","CCI","EQIX",
  // ── Europe ──
  "SAP","ASML","NVO","AZN","SHEL","TTE","NESN","ROG","NOVN","MC",
  "OR","SIE","ALV","BAS","DTE","AIR","BN","SAN","BNP","CS",
  // ── Emerging / Other ──
  "BABA","JD","PDD","BIDU","NIO","LI","XPEV","MELI","NU","GLOB",
  "INFY","WIT","HDB",
];

export function getStockUniverse(): string[] {
  return [...STOCK_UNIVERSE];
}

export function getRemainingRequests(): number {
  const today = new Date().toDateString();
  if (today !== lastResetDate) return DAILY_LIMIT;
  return Math.max(0, DAILY_LIMIT - requestCount);
}
