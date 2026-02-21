import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const stocks = await db.stock.findMany({
    include: { brokerAvailability: true },
    orderBy: { upside: "desc" },
  });

  const etfs = await db.etf.findMany({
    include: { brokerAvailability: true },
  });

  return NextResponse.json({
    stocks: stocks.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      price: s.price,
      target: s.target,
      upside: s.upside,
      buys: s.buys,
      holds: s.holds,
      sells: s.sells,
      analysts: s.analysts,
      sector: s.sector,
      risk: s.risk,
      horizon: s.horizon,
      region: s.region,
      exchange: s.exchange,
      currency: s.currency,
      dividendYield: s.dividendYield,
      marketCap: s.marketCap,
      description: s.description,
      whyThisPick: s.whyThisPick,
      belowSma200: s.belowSma200,
      brokers: s.brokerAvailability.map((b) => b.brokerId),
    })),
    etfs: etfs.map((e) => ({
      symbol: e.symbol,
      name: e.name,
      cagr1y: e.cagr1y,
      cagr3y: e.cagr3y,
      cagr5y: e.cagr5y,
      drawdown: e.drawdown,
      fee: e.fee,
      sharpe: e.sharpe,
      theme: e.theme,
      region: e.region,
      exchange: e.exchange,
      currency: e.currency,
      description: e.description,
      brokers: e.brokerAvailability.map((b) => b.brokerId),
    })),
  });
}
