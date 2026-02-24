"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { StockPick, StockFilters, RiskLevel, MixAllocation } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TickerCard } from "@/components/features/ticker-card";
import { StockFilterBar, defaultStockFilters } from "@/components/features/filter-bar";

export function AutoMix() {
  const t = useTranslations("mix");
  const [stocks, setStocks] = useState<StockPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(500);
  const [filters, setFilters] = useState<StockFilters>(defaultStockFilters);

  useEffect(() => {
    fetch("/api/stocks")
      .then((r) => r.json())
      .then((data) => { setStocks(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sectors = useMemo(
    () => [...new Set(stocks.map((p) => p.sector))].sort(),
    [stocks]
  );

  const filtered = useMemo(() => {
    return stocks.filter((p) => {
      if (filters.region !== "all" && p.region !== filters.region) return false;
      if (filters.sector !== "all" && p.sector !== filters.sector) return false;
      if (filters.risk !== "any" && p.risk !== filters.risk) return false;
      if (filters.horizon !== "any" && p.horizon !== filters.horizon) return false;
      if (filters.broker !== "any" && !p.brokerAvailability.includes(filters.broker as any)) return false;
      if (filters.marketCap !== "any" && p.marketCap !== filters.marketCap) return false;
      if (p.upside < filters.minUpside) return false;
      if (p.price > filters.maxPrice) return false;
      if (filters.dividendOnly && p.dividendYield <= 0) return false;
      return true;
    });
  }, [stocks, filters]);

  const result = useMemo(() => {
    const ranked = [...filtered].sort((a, b) => b.upside - a.upside);

    // Pick based on diversification: budget / avg price determines count
    const avgPrice = ranked.length > 0 ? ranked.reduce((s, p) => s + p.price, 0) / ranked.length : 100;
    const maxPicks = Math.min(Math.max(Math.floor(amount / avgPrice), 2), Math.min(ranked.length, 8));
    const top = ranked.slice(0, Math.max(maxPicks, Math.min(4, ranked.length)));

    if (top.length === 0) return { allocations: [], cash: amount, totalInvested: 0 };

    const weightSum = top.reduce((sum, _, idx) => sum + (top.length - idx), 0);

    const allocations: MixAllocation[] = top.map((p, idx) => {
      const weight = (top.length - idx) / weightSum;
      const dollars = Math.round(amount * weight * 100) / 100;
      const shares = Math.floor((dollars / p.price) * 100) / 100;
      const spend = Math.round(shares * p.price * 100) / 100;
      return {
        symbol: p.symbol,
        name: p.name,
        price: p.price,
        risk: p.risk,
        weight,
        dollars,
        shares,
        spend,
        upside: p.upside,
      };
    });

    const spent = allocations.reduce((s, a) => s + a.spend, 0);
    const cash = Math.round((amount - spent) * 100) / 100;
    return { allocations, cash, totalInvested: spent };
  }, [filtered, amount]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card variant="glass" padding="sm" className="flex items-center gap-3">
        <Input
          label={t("amount")}
          id="mix-amount"
          type="number"
          value={amount}
          min={50}
          max={10000}
          step={50}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
        />
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
                  <Badge>{Math.round(alloc.weight * 100)}%</Badge>
                  <span className="text-text-secondary">${alloc.dollars.toFixed(2)}</span>
                  <span className="font-semibold text-text-primary">{alloc.shares.toFixed(2)} sh</span>
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
          ${result.cash.toFixed(2)}
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
