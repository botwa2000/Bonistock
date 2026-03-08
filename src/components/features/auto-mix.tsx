"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import type { StockPick, StockFilters, MixAllocation, StockMixStrategy } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TickerCard } from "@/components/features/ticker-card";
import { StockFilterBar, defaultStockFilters } from "@/components/features/filter-bar";
import { formatPrice } from "@/lib/currency";

const STRATEGIES: StockMixStrategy[] = ["maxUpside", "balancedRisk", "dividendIncome", "sectorDiversified"];

function buildAllocations(
  strategy: StockMixStrategy,
  filtered: StockPick[],
  amount: number,
): { allocations: MixAllocation[]; cash: number; totalInvested: number } {
  // 1. Rank candidates by strategy
  let ranked: StockPick[] = [];

  switch (strategy) {
    case "maxUpside":
      ranked = [...filtered].sort((a, b) => b.upside - a.upside);
      break;
    case "balancedRisk": {
      const safe = filtered.filter((p) => p.risk === "low" || p.risk === "balanced");
      ranked = [...safe].sort((a, b) => b.upside - a.upside);
      break;
    }
    case "dividendIncome": {
      const divStocks = filtered.filter((p) => p.dividendYield > 0);
      ranked = [...divStocks].sort((a, b) => b.dividendYield - a.dividendYield);
      break;
    }
    case "sectorDiversified": {
      const bySector = new Map<string, StockPick>();
      const sorted = [...filtered].sort((a, b) => b.upside - a.upside);
      for (const p of sorted) {
        if (!bySector.has(p.sector)) bySector.set(p.sector, p);
      }
      ranked = [...bySector.values()];
      break;
    }
  }

  // 2. Only keep stocks we can afford at least 1 share of
  const affordable = ranked.filter((p) => p.price <= amount);
  if (affordable.length === 0) return { allocations: [], cash: amount, totalInvested: 0 };

  // 3. Determine target positions (aim for 4-8 based on budget and prices)
  const targetPositions = Math.min(affordable.length, 8);
  const picks = affordable.slice(0, targetPositions);

  // 4. First pass: equal allocation, buy whole shares
  const perPosition = amount / picks.length;
  const shares = new Map<string, number>();
  for (const p of picks) {
    shares.set(p.symbol, Math.floor(perPosition / p.price));
  }

  // Remove picks where 0 shares could be bought
  const filled = picks.filter((p) => (shares.get(p.symbol) ?? 0) > 0);
  if (filled.length === 0) return { allocations: [], cash: amount, totalInvested: 0 };

  // 5. Redistribute leftover: buy more shares starting from top-ranked
  let spent = filled.reduce((s, p) => s + (shares.get(p.symbol) ?? 0) * p.price, 0);
  let remaining = amount - spent;
  for (const p of filled) {
    while (remaining >= p.price) {
      shares.set(p.symbol, (shares.get(p.symbol) ?? 0) + 1);
      remaining -= p.price;
      spent += p.price;
    }
  }

  // 6. Build allocations with actual spend
  const allocations: MixAllocation[] = filled.map((p) => {
    const count = shares.get(p.symbol) ?? 0;
    const positionSpend = Math.round(count * p.price * 100) / 100;
    return {
      symbol: p.symbol,
      name: p.name,
      price: p.price,
      risk: p.risk,
      weight: spent > 0 ? positionSpend / spent : 0,
      dollars: positionSpend,
      shares: count,
      spend: positionSpend,
      upside: p.upside,
    };
  });

  const cash = Math.round((amount - spent) * 100) / 100;
  return { allocations, cash, totalInvested: Math.round(spent * 100) / 100 };
}

export function AutoMix() {
  const t = useTranslations("mix");
  const { user } = useAuth();
  const [stocks, setStocks] = useState<StockPick[]>([]);
  const [freeSymbols, setFreeSymbols] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(500);
  const [strategy, setStrategy] = useState<StockMixStrategy>("maxUpside");
  const [filters, setFilters] = useState<StockFilters>(defaultStockFilters);

  const tier = user?.tier ?? "free";
  const hasFullAccess = tier === "plus" || (tier === "pass" && user?.passWindowActive);

  useEffect(() => {
    fetch("/api/stocks")
      .then((r) => r.json())
      .then((data) => {
        setStocks(data.stocks ?? data);
        if (data.freeSymbols) setFreeSymbols(new Set(data.freeSymbols));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sectors = useMemo(
    () => [...new Set(stocks.map((p) => p.sector))].sort(),
    [stocks]
  );

  const filtered = useMemo(() => {
    // Free users can only mix from stocks they can actually view
    const pool = hasFullAccess ? stocks : stocks.filter((p) => freeSymbols.has(p.symbol));
    return pool.filter((p) => {
      if (filters.region !== "all" && p.region !== filters.region) return false;
      if (filters.sector !== "all" && p.sector !== filters.sector) return false;
      if (filters.risk !== "any" && p.risk !== filters.risk) return false;
      if (filters.broker !== "any" && !p.brokerAvailability.includes(filters.broker as any)) return false;
      if (filters.marketCap !== "any" && p.marketCap !== filters.marketCap) return false;
      if (p.upside < filters.minUpside) return false;
      if (p.price > filters.maxPrice) return false;
      if (filters.dividendOnly && p.dividendYield <= 0) return false;
      return true;
    });
  }, [stocks, filters, hasFullAccess, freeSymbols]);

  const result = useMemo(
    () => buildAllocations(strategy, filtered, amount),
    [strategy, filtered, amount],
  );

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Strategy selector */}
      <div className="flex flex-wrap gap-2">
        {STRATEGIES.map((s) => (
          <button
            key={s}
            onClick={() => setStrategy(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              strategy === s
                ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/30"
                : "bg-surface text-text-secondary border border-border hover:text-text-primary"
            }`}
          >
            {t(`strategy_${s}`)}
          </button>
        ))}
      </div>
      <p className="text-xs text-text-tertiary">{t(`strategyDesc_${strategy}`)}</p>

      <Card variant="glass" padding="sm" className="space-y-3 px-4 py-3">
        <label className="text-xs text-text-secondary">{t("amount")}</label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-tertiary">$50</span>
          <input
            type="range"
            min={50}
            max={10000}
            step={50}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="flex-1 accent-emerald-400"
          />
          <span className="text-xs text-text-tertiary">$10k</span>
          <Input
            id="mix-amount"
            type="number"
            value={amount}
            min={50}
            max={10000}
            step={50}
            onChange={(e) => setAmount(Math.min(10000, Math.max(50, Number(e.target.value) || 50)))}
            className="!w-24 text-center"
          />
        </div>
        <div className="flex gap-2">
          {[500, 1000, 2500, 5000].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(v)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                amount === v
                  ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/30"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {v >= 1000 ? `$${v / 1000}k` : `$${v}`}
            </button>
          ))}
        </div>
      </Card>

      <StockFilterBar
        filters={filters}
        onChange={setFilters}
        resultCount={filtered.length}
        sectors={sectors}
      />

      {result.allocations.length === 0 ? (
        <Card variant="glass" className="py-8 text-center">
          <p className="text-text-secondary">No stocks match your filters. Try broadening your criteria.</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {result.allocations.map((alloc) => {
            const stock = stocks.find((s) => s.symbol === alloc.symbol);
            return (
              <div key={alloc.symbol} className="relative">
                {stock && <TickerCard pick={stock} compact />}
                <div className="mt-1 flex items-center justify-between rounded-lg border border-border-subtle bg-surface-elevated/80 px-3 py-1.5 text-xs">
                  <span className="font-semibold text-text-primary">{alloc.shares} × {formatPrice(alloc.price)}</span>
                  <span className="text-text-secondary">{formatPrice(alloc.spend)}</span>
                  <Badge>{Math.round(alloc.weight * 100)}%</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Card
        variant="glass"
        padding="sm"
        className="flex items-center justify-between px-4 py-3"
      >
        <span className="text-sm text-text-secondary">
          {t("unusedCash")}
        </span>
        <Badge variant="default" className="text-sm font-semibold">
          {formatPrice(result.cash)}
        </Badge>
      </Card>

      <div className="flex gap-3">
        <Link href="/dashboard/brokers">
          <Button>{t("execute")}</Button>
        </Link>
        <Button variant="secondary">{t("saveMix")}</Button>
      </div>
    </div>
  );
}
