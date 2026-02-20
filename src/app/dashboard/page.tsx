"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { stockPicks, etfPicks } from "@/lib/mock-data";
import type { StockFilters } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { TickerCard } from "@/components/features/ticker-card";
import { DayPassBanner } from "@/components/features/day-pass-banner";
import { StockFilterBar, defaultStockFilters } from "@/components/features/filter-bar";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tf = useTranslations("filters");
  const { user } = useAuth();
  const username = user?.name ?? user?.email ?? "";
  const tier = user?.tier ?? "free";

  const [filters, setFilters] = useState<StockFilters>(defaultStockFilters);

  const sectors = useMemo(
    () => [...new Set(stockPicks.map((p) => p.sector))].sort(),
    []
  );

  const filtered = useMemo(() => {
    return stockPicks.filter((p) => {
      if (filters.region !== "all" && p.region !== filters.region) return false;
      if (filters.sector !== "all" && p.sector !== filters.sector) return false;
      if (filters.risk !== "any" && p.risk !== filters.risk) return false;
      if (filters.horizon !== "any" && p.horizon !== filters.horizon)
        return false;
      if (filters.broker !== "any" && !p.brokerAvailability.includes(filters.broker as any))
        return false;
      if (filters.marketCap !== "any" && p.marketCap !== filters.marketCap)
        return false;
      if (p.upside < filters.minUpside) return false;
      if (p.analysts < filters.minAnalysts) return false;
      if (p.price > filters.maxPrice) return false;
      if (filters.dividendOnly && p.dividendYield <= 0) return false;
      return true;
    });
  }, [filters]);

  const visiblePicks =
    tier === "free" ? filtered.slice(0, 5) : filtered;

  const avgUpside =
    stockPicks.reduce((sum, p) => sum + p.upside, 0) / stockPicks.length;
  const avgAnalysts =
    stockPicks.reduce((sum, p) => sum + p.analysts, 0) / stockPicks.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          {t("welcome")}, {username}
        </h1>
        <p className="mt-1 text-sm text-white/60">{t("upsideSubtitle")}</p>
      </div>

      <DayPassBanner />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: t("statsUpside"), value: `${avgUpside.toFixed(1)}%` },
          { label: t("statsAnalysts"), value: avgAnalysts.toFixed(0) },
          { label: t("statsStocks"), value: `${stockPicks.length}` },
          { label: t("statsEtfs"), value: `${etfPicks.length}` },
        ].map((stat) => (
          <Card key={stat.label} variant="glass">
            <div className="text-xs uppercase text-white/60">{stat.label}</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {stat.value}
            </div>
          </Card>
        ))}
      </div>

      <StockFilterBar
        filters={filters}
        onChange={setFilters}
        resultCount={filtered.length}
        sectors={sectors}
      />

      <SectionHeader
        overline={t("topPicks")}
        title={t("upsideList")}
        action={
          tier === "free" ? (
            <Badge variant="warning">
              Free tier: showing top 5 of {filtered.length}
            </Badge>
          ) : tier === "pass" ? (
            <Badge variant="accent">
              Pass active &mdash; full list unlocked
            </Badge>
          ) : (
            <Badge variant="accent">{t("fullList")}</Badge>
          )
        }
      />

      {visiblePicks.length === 0 ? (
        <Card variant="glass" className="py-12 text-center">
          <p className="text-white/60">{tf("noResults")}</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visiblePicks.map((pick) => (
            <TickerCard key={pick.symbol} pick={pick} />
          ))}
        </div>
      )}
    </div>
  );
}
