import { db } from "./db";
import type { RiskLevel } from "@prisma/client";

export interface StockFilters {
  region?: string;
  sector?: string;
  risk?: RiskLevel;
  minUpside?: number;
  minAnalysts?: number;
  maxPrice?: number;
  broker?: string;
  marketCap?: string;
  dividendOnly?: boolean;
}

export interface EtfFilters {
  region?: string;
  theme?: string;
  maxFee?: number;
  minSharpe?: number;
  broker?: string;
}

export async function getStocks(filters?: StockFilters) {
  const where: Record<string, unknown> = {};
  if (filters?.region && filters.region !== "all") where.region = filters.region;
  if (filters?.sector) where.sector = filters.sector;
  if (filters?.risk) where.risk = filters.risk;
  if (filters?.minUpside) where.upside = { gte: filters.minUpside };
  if (filters?.minAnalysts) where.analysts = { gte: filters.minAnalysts };
  if (filters?.maxPrice) where.price = { lte: filters.maxPrice };
  if (filters?.marketCap && filters.marketCap !== "any") where.marketCap = filters.marketCap;
  if (filters?.dividendOnly) where.dividendYield = { gt: 0 };

  const stocks = await db.stock.findMany({
    where,
    include: { brokerAvailability: true },
    orderBy: { upside: "desc" },
  });

  if (filters?.broker) {
    return stocks.filter((s) =>
      s.brokerAvailability.some((ba) => ba.brokerId === filters.broker)
    );
  }

  return stocks;
}

export async function getStock(symbol: string) {
  return db.stock.findUnique({
    where: { symbol },
    include: { brokerAvailability: true },
  });
}

export async function getEtfs(filters?: EtfFilters) {
  const where: Record<string, unknown> = {};
  if (filters?.region && filters.region !== "all") where.region = filters.region;
  if (filters?.theme) where.theme = filters.theme;
  if (filters?.maxFee) where.fee = { lte: filters.maxFee };
  if (filters?.minSharpe) where.sharpe = { gte: filters.minSharpe };

  const etfs = await db.etf.findMany({
    where,
    include: { brokerAvailability: true },
    orderBy: { cagr5y: "desc" },
  });

  if (filters?.broker) {
    return etfs.filter((e) =>
      e.brokerAvailability.some((ba) => ba.brokerId === filters.broker)
    );
  }

  return etfs;
}

export async function getEtf(symbol: string) {
  return db.etf.findUnique({
    where: { symbol },
    include: { brokerAvailability: true },
  });
}

export async function getBrokers(region?: string) {
  const brokers = await db.broker.findMany({ orderBy: { name: "asc" } });
  if (region) {
    return brokers.filter((b) =>
      (b.regions as string[]).includes(region)
    );
  }
  return brokers;
}

export async function getDemoPortfolios() {
  return db.demoPortfolio.findMany({
    include: {
      snapshots: {
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });
}

export async function getDemoPortfolioWithSnapshots(id: string) {
  return db.demoPortfolio.findUnique({
    where: { id },
    include: {
      snapshots: {
        orderBy: { date: "asc" },
      },
    },
  });
}
