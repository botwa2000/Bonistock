export type RiskLevel = "low" | "balanced" | "high";
export type Goal = "growth" | "income" | "balanced";
export type Tier = "free" | "pass" | "plus";
export type PassDuration = "1day" | "3day" | "12day";
export type UserRegion = "us" | "de";
export type Horizon = "6M" | "12M" | "24M";
export type Region = "us" | "europe" | "em" | "global";
export type BrokerId =
  | "ibkr"
  | "t212"
  | "robinhood"
  | "etoro"
  | "fidelity"
  | "schwab"
  | "webull"
  | "traderepublic"
  | "scalable"
  | "ing"
  | "comdirect";

export interface StockPick {
  symbol: string;
  name: string;
  price: number;
  upside: number;
  target: number;
  buys: number;
  holds: number;
  sells: number;
  analysts: number;
  sector: string;
  risk: RiskLevel;
  horizon: Horizon;
  region: Region;
  exchange: string;
  currency: string;
  brokerAvailability: BrokerId[];
  dividendYield: number;
  marketCap: "small" | "mid" | "large" | "mega";
  description: string;
  whyThisPick: string;
  belowSma200: boolean;
}

export interface EtfPick {
  symbol: string;
  name: string;
  cagr1y: number;
  cagr3y: number;
  cagr5y: number;
  drawdown: number;
  fee: number;
  sharpe: number;
  theme: string;
  region: Region;
  exchange: string;
  currency: string;
  brokerAvailability: BrokerId[];
  description: string;
}

export interface Broker {
  id: BrokerId;
  name: string;
  logo: string;
  fractional: boolean;
  commission: string;
  minDeposit: string;
  features: string[];
  cta: string;
  regions: UserRegion[];
  sparplan?: boolean;
  sparplanMin?: string;
}

export interface MixAllocation {
  symbol: string;
  name: string;
  price: number;
  risk: RiskLevel;
  weight: number;
  dollars: number;
  shares: number;
  spend: number;
  upside: number;
}

export interface MixResult {
  allocations: MixAllocation[];
  cash: number;
  totalInvested: number;
}

export interface User {
  username: string;
  email: string;
  tier: Tier;
  goal: Goal;
  memberSince: string;
  region: UserRegion;
  passExpiry?: string;
  passType?: PassDuration;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface PricingTier {
  name: string;
  tier: Tier;
  price: string;
  priceAnnual?: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  duration?: string;
}

export interface PassOption {
  duration: PassDuration;
  name: string;
  price: string;
  priceNumeric: number;
  hours: number;
  description: string;
  perDay: string;
  savings?: string;
}

export interface Alert {
  id: string;
  symbol: string;
  type: "price_target" | "rating_change" | "trend_warning";
  message: string;
  triggered: boolean;
  createdAt: string;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  upside: number;
  addedAt: string;
}

export interface StockFilters {
  region: Region | "all";
  sector: string;
  risk: RiskLevel | "any";
  horizon: Horizon | "any";
  minUpside: number;
  minAnalysts: number;
  maxPrice: number;
  broker: BrokerId | "any";
  marketCap: "small" | "mid" | "large" | "mega" | "any";
  dividendOnly: boolean;
}

export interface EtfFilters {
  region: Region | "all";
  theme: string;
  maxFee: number;
  minSharpe: number;
  broker: BrokerId | "any";
}
