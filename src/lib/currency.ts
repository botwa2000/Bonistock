const CURRENCY_CONFIG: Record<string, { symbol: string; position: "before" | "after"; decimals: number }> = {
  USD: { symbol: "$", position: "before", decimals: 2 },
  EUR: { symbol: "\u20AC", position: "before", decimals: 2 },
  GBP: { symbol: "\u00A3", position: "before", decimals: 2 },
  JPY: { symbol: "\u00A5", position: "before", decimals: 0 },
  CHF: { symbol: "CHF\u00A0", position: "before", decimals: 2 },
  SEK: { symbol: "\u00A0kr", position: "after", decimals: 2 },
  NOK: { symbol: "\u00A0kr", position: "after", decimals: 2 },
  DKK: { symbol: "\u00A0kr", position: "after", decimals: 2 },
  CAD: { symbol: "CA$", position: "before", decimals: 2 },
  AUD: { symbol: "A$", position: "before", decimals: 2 },
  HKD: { symbol: "HK$", position: "before", decimals: 2 },
  SGD: { symbol: "S$", position: "before", decimals: 2 },
  KRW: { symbol: "\u20A9", position: "before", decimals: 0 },
  INR: { symbol: "\u20B9", position: "before", decimals: 2 },
  BRL: { symbol: "R$", position: "before", decimals: 2 },
  ZAR: { symbol: "R", position: "before", decimals: 2 },
  MXN: { symbol: "MX$", position: "before", decimals: 2 },
  CNY: { symbol: "\u00A5", position: "before", decimals: 2 },
};

export function formatPrice(amount: number, currency?: string): string {
  const code = (currency ?? "USD").toUpperCase();
  const config = CURRENCY_CONFIG[code] ?? { symbol: `${code}\u00A0`, position: "before", decimals: 2 };
  const formatted = amount.toFixed(config.decimals);
  return config.position === "before"
    ? `${config.symbol}${formatted}`
    : `${formatted}${config.symbol}`;
}

export function getCurrencySymbol(currency?: string): string {
  const code = (currency ?? "USD").toUpperCase();
  const config = CURRENCY_CONFIG[code];
  return config ? config.symbol.trim() : code;
}
