import type { StockPick, EtfPick } from "./types";

interface DbStockBroker {
  brokerId: string;
}

interface DbStock {
  symbol: string;
  name: string;
  price: number;
  target: number;
  upside: number;
  buys: number;
  holds: number;
  sells: number;
  analysts: number;
  sector: string;
  risk: string;
  horizon: string;
  region: string;
  exchange: string;
  currency: string;
  dividendYield: number | null;
  marketCap: string;
  description: string;
  whyThisPick: string;
  belowSma200: boolean;
  isin?: string | null;
  wkn?: string | null;
  brokerAvailability: DbStockBroker[];
}

interface DbEtfBroker {
  brokerId: string;
}

interface DbEtf {
  symbol: string;
  name: string;
  cagr1y: number;
  cagr3y: number | null;
  cagr5y: number | null;
  drawdown: number;
  fee: number | null;
  sharpe: number;
  theme: string;
  region: string;
  exchange: string;
  currency: string;
  description: string;
  isin?: string | null;
  wkn?: string | null;
  brokerAvailability: DbEtfBroker[];
}

export function mapStockToFrontend(stock: DbStock): StockPick {
  return {
    symbol: stock.symbol,
    name: stock.name,
    price: stock.price,
    target: stock.target,
    upside: stock.upside,
    buys: stock.buys,
    holds: stock.holds,
    sells: stock.sells,
    analysts: stock.analysts,
    sector: stock.sector,
    risk: stock.risk.toLowerCase() as StockPick["risk"],
    horizon: stock.horizon as StockPick["horizon"],
    region: stock.region.toLowerCase() as StockPick["region"],
    exchange: stock.exchange,
    currency: stock.currency,
    dividendYield: stock.dividendYield ?? 0,
    marketCap: stock.marketCap.toLowerCase() as StockPick["marketCap"],
    description: stock.description,
    whyThisPick: stock.whyThisPick,
    belowSma200: stock.belowSma200,
    isin: stock.isin ?? undefined,
    wkn: stock.wkn ?? undefined,
    brokerAvailability: stock.brokerAvailability.map((ba) => ba.brokerId) as StockPick["brokerAvailability"],
  };
}

export function mapEtfToFrontend(etf: DbEtf): EtfPick {
  return {
    symbol: etf.symbol,
    name: etf.name,
    cagr1y: etf.cagr1y,
    cagr3y: etf.cagr3y,
    cagr5y: etf.cagr5y,
    drawdown: etf.drawdown,
    fee: etf.fee,
    sharpe: etf.sharpe,
    theme: etf.theme,
    region: etf.region.toLowerCase() as EtfPick["region"],
    exchange: etf.exchange,
    currency: etf.currency,
    description: etf.description,
    isin: etf.isin ?? undefined,
    wkn: etf.wkn ?? undefined,
    brokerAvailability: etf.brokerAvailability.map((ba) => ba.brokerId) as EtfPick["brokerAvailability"],
  };
}
