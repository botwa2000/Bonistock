"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import type { StockPick, StockFilters } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { TickerCard } from "@/components/features/ticker-card";
import { DayPassBanner } from "@/components/features/day-pass-banner";
import { StockFilterBar, defaultStockFilters } from "@/components/features/filter-bar";
import { PaymentToast } from "@/components/features/payment-toast";
import Link from "next/link";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tf = useTranslations("filters");
  const th = useTranslations("history");
  const { user } = useAuth();
  const username = user?.name ?? user?.email ?? "";
  const tier = user?.tier ?? "free";

  const [stocks, setStocks] = useState<StockPick[]>([]);
  const [etfCount, setEtfCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StockFilters>(defaultStockFilters);

  useEffect(() => {
    Promise.all([
      fetch("/api/stocks").then((r) => r.json()),
      fetch("/api/etfs").then((r) => r.json()),
    ]).then(([stockData, etfData]) => {
      setStocks(stockData);
      setEtfCount(etfData.length);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const sectors = useMemo(
    () => [...new Set(stocks.map((p) => p.sector))].sort(),
    [stocks]
  );

  // Top 5 stocks (by upside, the default sort) are free-tier visible
  const freeSymbols = useMemo(
    () => new Set(stocks.slice(0, 5).map((s) => s.symbol)),
    [stocks]
  );

  const filtered = useMemo(() => {
    return stocks.filter((p) => {
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
  }, [stocks, filters]);

  const avgUpside =
    stocks.length > 0 ? stocks.reduce((sum, p) => sum + p.upside, 0) / stocks.length : 0;
  const avgAnalysts =
    stocks.length > 0 ? stocks.reduce((sum, p) => sum + p.analysts, 0) / stocks.length : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PaymentToast />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          {t("welcome")}, {username}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{t("upsideSubtitle")}</p>
      </div>

      <DayPassBanner />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: t("statsUpside"), value: `${avgUpside.toFixed(1)}%` },
          { label: t("statsAnalysts"), value: avgAnalysts.toFixed(0) },
          { label: t("statsStocks"), value: `${stocks.length}` },
          { label: t("statsEtfs"), value: `${etfCount}` },
        ].map((stat) => (
          <Card key={stat.label} variant="glass">
            <div className="text-xs uppercase text-text-secondary">{stat.label}</div>
            <div className="mt-1 text-2xl font-semibold text-text-primary">
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
              Free tier: {filtered.filter((p) => freeSymbols.has(p.symbol)).length} live of {filtered.length}
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

      {filtered.length === 0 ? (
        <Card variant="glass" className="py-12 text-center">
          <p className="text-text-secondary">{tf("noResults")}</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pick) => (
            <TickerCard
              key={pick.symbol}
              pick={pick}
              locked={tier === "free" && !freeSymbols.has(pick.symbol)}
            />
          ))}
        </div>
      )}

      {/* History promo banner */}
      <Card variant="glass" className="flex items-center gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-lg">
          {"\u21BB"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text-primary">
            {th("promoBanner")}
          </div>
          <div className="text-xs text-text-secondary">
            {th("promoSubtitle")}
          </div>
        </div>
        {tier === "free" ? (
          <Link href="/pricing">
            <Badge variant="accent" className="cursor-pointer whitespace-nowrap">
              {th("promoCtaFree")}
            </Badge>
          </Link>
        ) : (
          <Link href="/dashboard/history">
            <Badge variant="accent" className="cursor-pointer whitespace-nowrap">
              {th("promoCtaPaid")} {"\u2192"}
            </Badge>
          </Link>
        )}
      </Card>
    </div>
  );
}
