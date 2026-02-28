"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import type { EtfPick, EtfFilters } from "@/lib/types";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EtfCard, EtfRow } from "@/components/features/etf-card";
import { EtfFilterBar, defaultEtfFilters } from "@/components/features/filter-bar";
import { Button } from "@/components/ui/button";

const FREE_ETF_LIMIT = 5;
const PAGE_SIZE = 50;

export default function EtfsPage() {
  const t = useTranslations("nav");
  const tf = useTranslations("filters");
  const td = useTranslations("dashboard");
  const tt = useTranslations("tiers");
  const { user } = useAuth();
  const tier = user?.tier ?? "free";

  const [etfs, setEtfs] = useState<EtfPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EtfFilters>(defaultEtfFilters);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const handleFilterChange = useCallback((newFilters: EtfFilters) => {
    setFilters(newFilters);
    setVisibleCount(PAGE_SIZE);
  }, []);

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

  const maxCagr = useMemo(
    () => etfs.length > 0 ? Math.max(...etfs.map((e) => e.cagr5y ?? e.cagr1y ?? 0)) : 20,
    [etfs]
  );

  const filtered = useMemo(() => {
    let result = etfs.filter((e) => {
      if (filters.region !== "all" && e.region !== filters.region) return false;
      if (filters.theme !== "all" && e.theme !== filters.theme) return false;
      if (filters.broker !== "any" && !e.brokerAvailability.includes(filters.broker as any))
        return false;
      if (filters.minCagr > 0) {
        const cagr = e.cagr5y ?? e.cagr1y ?? 0;
        if (cagr < filters.minCagr) return false;
      }
      if (filters.status !== "any") {
        const now = Date.now();
        const createdMs = e.createdAt ? now - new Date(e.createdAt).getTime() : Infinity;
        const updatedMs = e.updatedAt ? now - new Date(e.updatedAt).getTime() : Infinity;
        const isNew = createdMs < 7 * 24 * 60 * 60 * 1000
          && (e.updatedAt && e.createdAt
            ? Math.abs(new Date(e.createdAt).getTime() - new Date(e.updatedAt).getTime()) < 24 * 60 * 60 * 1000
            : true);
        const isUpdated = !isNew && updatedMs < 24 * 60 * 60 * 1000;
        if (filters.status === "new" && !isNew) return false;
        if (filters.status === "updated" && !isUpdated) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !e.symbol.toLowerCase().includes(q) &&
          !e.name.toLowerCase().includes(q) &&
          !(e.isin && e.isin.toLowerCase().includes(q)) &&
          !(e.wkn && e.wkn.toLowerCase().includes(q)) &&
          !e.exchange.toLowerCase().includes(q) &&
          !e.theme.toLowerCase().includes(q) &&
          !e.description.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });

    // Sort
    const dir = filters.sortDir === "asc" ? 1 : -1;
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case "name": return dir * a.name.localeCompare(b.name);
        case "fee": return dir * ((a.fee ?? 0) - (b.fee ?? 0));
        case "drawdown": return dir * (a.drawdown - b.drawdown);
        case "sharpe": return dir * (a.sharpe - b.sharpe);
        case "cagr5y":
        default: return dir * ((a.cagr5y ?? a.cagr1y ?? 0) - (b.cagr5y ?? b.cagr1y ?? 0));
      }
    });

    return result;
  }, [etfs, filters]);

  const freeSymbols = useMemo(
    () => new Set(etfs.slice(0, FREE_ETF_LIMIT).map((e) => e.symbol)),
    [etfs]
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        overline="ETF Explorer"
        title="Top 100 ETFs ranked by actual returns"
        subtitle="Sorted by how much each ETF actually returned over 1, 3, and 5 years. Updated weekly from real market data."
        action={
          <Badge variant="accent">{tt(tier as "free" | "pass" | "plus")}</Badge>
        }
      />

      <p className="text-xs text-text-tertiary">{td("eodDisclaimer")}</p>

      <EtfFilterBar
        filters={filters}
        onChange={handleFilterChange}
        resultCount={filtered.length}
        themes={themes}
        maxCagr={Math.ceil(maxCagr)}
      />

      {filtered.length === 0 ? (
        <Card variant="glass" className="py-12 text-center">
          <p className="text-text-secondary">{tf("noResults")}</p>
        </Card>
      ) : filters.viewMode === "list" ? (
        <>
          <div className="hidden md:flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1 text-[10px] sm:text-xs uppercase text-text-tertiary">
            <span className="w-14 sm:w-20">Symbol</span>
            <span className="flex-1">Name</span>
            <span className="w-16 text-right">5Y CAGR</span>
            <span className="hidden md:block w-16 text-right">Drawdown</span>
            <span className="hidden lg:block w-16 text-right">Sharpe</span>
            <span className="hidden lg:block w-24">Theme</span>
            <span className="hidden sm:block w-12">Type</span>
            <span className="hidden xl:block w-28">ISIN</span>
          </div>
          <div className="space-y-1">
            {filtered.slice(0, visibleCount).map((etf) => (
              <EtfRow
                key={etf.symbol}
                etf={etf}
                locked={tier === "free" && !freeSymbols.has(etf.symbol)}
              />
            ))}
          </div>
          {filtered.length > visibleCount && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                Show More ({filtered.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, visibleCount).map((etf) => (
              <EtfCard
                key={etf.symbol}
                etf={etf}
                locked={tier === "free" && !freeSymbols.has(etf.symbol)}
              />
            ))}
          </div>
          {filtered.length > visibleCount && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                Show More ({filtered.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
