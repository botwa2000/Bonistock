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

async function fmpFetch<T>(path: string, schema: z.ZodSchema<T>): Promise<T> {
  checkRateLimit();
  const url = `https://financialmodelingprep.com/api/v3${path}?apikey=${getApiKey()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FMP API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

const quoteSchema = z.array(z.object({
  symbol: z.string(),
  price: z.number(),
  changesPercentage: z.number(),
  change: z.number(),
  priceAvg200: z.number().optional(),
}));

export async function fetchStockQuote(symbol: string) {
  const data = await fmpFetch(`/quote/${symbol}`, quoteSchema);
  return data[0] ?? null;
}

const profileSchema = z.array(z.object({
  symbol: z.string(),
  companyName: z.string(),
  sector: z.string(),
  mktCap: z.number(),
  description: z.string(),
  currency: z.string(),
  exchangeShortName: z.string(),
}));

export async function fetchStockProfile(symbol: string) {
  const data = await fmpFetch(`/profile/${symbol}`, profileSchema);
  return data[0] ?? null;
}

const ratingSchema = z.array(z.object({
  symbol: z.string(),
  analystRatingsStrongBuy: z.number().optional(),
  analystRatingsBuy: z.number().optional(),
  analystRatingsHold: z.number().optional(),
  analystRatingsSell: z.number().optional(),
  analystRatingsStrongSell: z.number().optional(),
}));

export async function fetchAnalystRatings(symbol: string) {
  const data = await fmpFetch(`/grade/${symbol}`, ratingSchema);
  return data[0] ?? null;
}

const priceTargetSchema = z.array(z.object({
  symbol: z.string(),
  targetHigh: z.number(),
  targetLow: z.number(),
  targetConsensus: z.number(),
  targetMedian: z.number(),
}));

export async function fetchPriceTarget(symbol: string) {
  const data = await fmpFetch(`/price-target-summary/${symbol}`, priceTargetSchema);
  return data[0] ?? null;
}

// ── Screener ──

const screenerSchema = z.array(z.object({
  symbol: z.string(),
  companyName: z.string(),
  marketCap: z.number(),
  sector: z.string().optional().default(""),
  price: z.number(),
  exchange: z.string().optional().default(""),
  country: z.string().optional().default(""),
  exchangeShortName: z.string().optional().default(""),
}));

export async function fetchScreenerStocks(limit = 100) {
  checkRateLimit();
  const params = new URLSearchParams({
    marketCapMoreThan: "5000000000",
    isActivelyTrading: "true",
    limit: String(limit),
    apikey: getApiKey(),
  });
  const url = `https://financialmodelingprep.com/api/v3/stock-screener?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP screener error: ${res.status}`);
  const data = await res.json();
  return screenerSchema.parse(data);
}

// ── Batch Quotes ──

const batchQuoteSchema = z.array(z.object({
  symbol: z.string(),
  price: z.number(),
  changesPercentage: z.number().optional(),
  priceAvg200: z.number().optional(),
}));

export async function fetchBatchQuotes(symbols: string[]) {
  const results: z.infer<typeof batchQuoteSchema> = [];
  const batchSize = 50;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    checkRateLimit();
    const url = `https://financialmodelingprep.com/api/v3/quote/${batch.join(",")}?apikey=${getApiKey()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`FMP batch quote error: ${res.status}`);
    const data = await res.json();
    results.push(...batchQuoteSchema.parse(data));
  }
  return results;
}

// ── Analyst Consensus (grade endpoint) ──

const gradeSchema = z.array(z.object({
  symbol: z.string().optional(),
  date: z.string().optional(),
  gradingCompany: z.string().optional(),
  previousGrade: z.string().optional(),
  newGrade: z.string().optional(),
}));

export async function fetchAnalystConsensus(symbol: string) {
  checkRateLimit();
  const url = `https://financialmodelingprep.com/api/v3/grade/${symbol}?limit=100&apikey=${getApiKey()}`;
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

export function getRemainingRequests(): number {
  const today = new Date().toDateString();
  if (today !== lastResetDate) return DAILY_LIMIT;
  return Math.max(0, DAILY_LIMIT - requestCount);
}
