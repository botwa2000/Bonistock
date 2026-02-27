"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { EtfPick, EtfFilters, EtfMixStrategy } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EtfFilterBar, defaultEtfFilters } from "@/components/features/filter-bar";
import { EtfCard } from "@/components/features/etf-card";
import { formatPrice } from "@/lib/currency";

interface EtfAllocation {
  symbol: string;
  name: string;
  sharpe: number;
  fee: number | null;
  weight: number;
  dollars: number;
}

const ETF_STRATEGIES: EtfMixStrategy[] = ["bestSharpe", "lowestFee", "highestReturn", "themeDiversified"];

function buildEtfAllocations(
  strategy: EtfMixStrategy,
  candidates: EtfPick[],
  amount: number,
): { allocations: EtfAllocation[]; cash: number } {
  let top: EtfPick[] = [];

  switch (strategy) {
    case "bestSharpe": {
      top = [...candidates].sort((a, b) => b.sharpe - a.sharpe).slice(0, 5);
      break;
    }
    case "lowestFee": {
      const withFee = candidates.filter((e) => e.fee != null);
      top = [...withFee].sort((a, b) => (a.fee ?? 99) - (b.fee ?? 99)).slice(0, 5);
      break;
    }
    case "highestReturn": {
      top = [...candidates].sort((a, b) => (b.cagr5y ?? b.cagr1y ?? 0) - (a.cagr5y ?? a.cagr1y ?? 0)).slice(0, 5);
      break;
    }
    case "themeDiversified": {
      const byTheme = new Map<string, EtfPick>();
      const sorted = [...candidates].sort((a, b) => b.sharpe - a.sharpe);
      for (const e of sorted) {
        if (!byTheme.has(e.theme)) byTheme.set(e.theme, e);
      }
      top = [...byTheme.values()].slice(0, 5);
      break;
    }
  }

  if (top.length === 0) return { allocations: [], cash: amount };

  // bestSharpe weights by Sharpe ratio; others use equal weight
  const useSharpeWeight = strategy === "bestSharpe";
  const totalSharpe = useSharpeWeight ? top.reduce((sum, e) => sum + e.sharpe, 0) : 0;

  const allocations: EtfAllocation[] = top.map((e) => {
    const weight = useSharpeWeight && totalSharpe > 0 ? e.sharpe / totalSharpe : 1 / top.length;
    const dollars = Math.round(amount * weight * 100) / 100;
    return {
      symbol: e.symbol,
      name: e.name,
      sharpe: e.sharpe,
      fee: e.fee,
      weight,
      dollars,
    };
  });

  const spent = allocations.reduce((s, a) => s + a.dollars, 0);
  const cash = Math.round((amount - spent) * 100) / 100;
  return { allocations, cash };
}

export function EtfMix() {
  const t = useTranslations("mix");
  const [etfs, setEtfs] = useState<EtfPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(1000);
  const [strategy, setStrategy] = useState<EtfMixStrategy>("bestSharpe");
  const [filters, setFilters] = useState<EtfFilters>(defaultEtfFilters);

  useEffect(() => {
    fetch("/api/etfs")
      .then((r) => r.json())
      .then((data) => { setEtfs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const themes = useMemo(
    () => [...new Set(etfs.map((e) => e.theme))].sort(),
    [etfs]
  );

  const candidates = useMemo(() => {
    return etfs.filter((e) => {
      if (filters.region !== "all" && e.region !== filters.region) return false;
      if (filters.theme !== "all" && e.theme !== filters.theme) return false;
      if (filters.broker !== "any" && !e.brokerAvailability.includes(filters.broker as any))
        return false;
      if (filters.minCagr > 0) {
        const cagr = e.cagr5y ?? e.cagr1y ?? 0;
        if (cagr < filters.minCagr) return false;
      }
      return true;
    });
  }, [etfs, filters]);

  const result = useMemo(
    () => buildEtfAllocations(strategy, candidates, amount),
    [strategy, candidates, amount],
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
        {ETF_STRATEGIES.map((s) => (
          <button
            key={s}
            onClick={() => setStrategy(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              strategy === s
                ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/30"
                : "bg-surface text-text-secondary border border-border hover:text-text-primary"
            }`}
          >
            {t(`etfStrategy_${s}`)}
          </button>
        ))}
      </div>
      <p className="text-xs text-text-tertiary">{t(`etfStrategyDesc_${strategy}`)}</p>

      <Card variant="glass" padding="sm" className="flex items-center gap-3">
        <Input
          label={t("etfAmount")}
          id="etf-mix-amount"
          type="number"
          value={amount}
          min={100}
          max={50000}
          step={100}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
        />
      </Card>

      <EtfFilterBar
        filters={filters}
        onChange={setFilters}
        resultCount={candidates.length}
        themes={themes}
      />

      {result.allocations.length === 0 ? (
        <Card variant="glass" className="py-8 text-center">
          <p className="text-text-secondary">No ETFs match your filters. Try broadening your criteria.</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {result.allocations.map((alloc) => {
            const etf = etfs.find((e) => e.symbol === alloc.symbol);
            return (
              <div key={alloc.symbol} className="relative">
                {etf && <EtfCard etf={etf} compact />}
                <div className="mt-1 flex items-center justify-between rounded-lg border border-border-subtle bg-surface-elevated/80 px-3 py-1.5 text-xs">
                  <Badge>{Math.round(alloc.weight * 100)}%</Badge>
                  <span className="font-semibold text-text-primary">{formatPrice(alloc.dollars)}</span>
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
