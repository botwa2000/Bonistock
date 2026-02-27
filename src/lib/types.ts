export type RiskLevel = "low" | "balanced" | "high";
export type Goal = "growth" | "income" | "balanced";
export type Tier = "free" | "pass" | "plus";
export type PassDuration = "1day" | "3day" | "12day";
export type UserRegion = "global" | "de";
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
  isin?: string;
  wkn?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EtfPick {
  symbol: string;
  name: string;
  cagr1y: number;
  cagr3y: number | null;
  cagr5y: number | null;
  drawdown: number;
  fee: number | null;
  sharpe: number;
  theme: string;
  region: Region;
  exchange: string;
  currency: string;
  brokerAvailability: BrokerId[];
  description: string;
  isin?: string;
  wkn?: string;
  createdAt?: string;
  updatedAt?: string;
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
  url: string;
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
  passActivationsRemaining?: number;
}

export interface FaqItem {
  question: string;
  answer: string;
  category?: string;
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

export interface StockHistoryItem {
  symbol: string;
  name: string;
  sector: string;
  region: string;
  appearances: number;
  avgUpside: number;
  latestUpside: number;
  firstDate: string;
  lastDate: string;
}

export interface StockHistoryTimeline {
  date: string;
  price: number;
  target: number;
  upside: number;
  analysts: number;
  risk: string;
}

export type StockMixStrategy = "maxUpside" | "balancedRisk" | "dividendIncome" | "sectorDiversified";
export type EtfMixStrategy = "bestSharpe" | "lowestFee" | "highestReturn" | "themeDiversified";

export type StockSortBy = "upside" | "name" | "price" | "analysts" | "conviction" | "dividendYield";
export type EtfSortBy = "cagr5y" | "name" | "fee" | "drawdown" | "sharpe";
export type SortDir = "asc" | "desc";
export type ViewMode = "grid" | "list";

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
  search: string;
  sortBy: StockSortBy;
  sortDir: SortDir;
  viewMode: ViewMode;
}

export interface EtfFilters {
  region: Region | "all";
  theme: string;
  minCagr: number;
  broker: BrokerId | "any";
  search: string;
  sortBy: EtfSortBy;
  sortDir: SortDir;
  viewMode: ViewMode;
}
