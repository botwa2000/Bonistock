"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import type { StockPick, StockFilters } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { TickerCard, TickerRow } from "@/components/features/ticker-card";
import { DayPassBanner } from "@/components/features/day-pass-banner";
import { StockFilterBar, defaultStockFilters } from "@/components/features/filter-bar";
import { PaymentToast } from "@/components/features/payment-toast";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const PAGE_SIZE = 50;

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tf = useTranslations("filters");
  const th = useTranslations("history");
  const { user } = useAuth();
  const username = user?.name ?? user?.email ?? "";
  const tier = user?.tier ?? "free";

  const [stocks, setStocks] = useState<StockPick[]>([]);
  const [freeSymbols, setFreeSymbols] = useState<Set<string>>(new Set());
  const [etfCount, setEtfCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StockFilters>(defaultStockFilters);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const handleFilterChange = useCallback((newFilters: StockFilters) => {
    setFilters(newFilters);
    setVisibleCount(PAGE_SIZE);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/stocks").then((r) => r.json()),
      fetch("/api/etfs").then((r) => r.json()),
    ]).then(([stockRes, etfData]) => {
      setStocks(stockRes.stocks);
      setFreeSymbols(new Set(stockRes.freeSymbols));
      setEtfCount(etfData.length);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const sectors = useMemo(
    () => [...new Set(stocks.map((p) => p.sector))].sort(),
    [stocks]
  );

  const filtered = useMemo(() => {
    let result = stocks.filter((p) => {
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
      if (p.price > filters.maxPrice) return false;
      if (filters.dividendOnly && p.dividendYield <= 0) return false;
      if (filters.status !== "any") {
        const now = Date.now();
        const createdMs = p.createdAt ? now - new Date(p.createdAt).getTime() : Infinity;
        const updatedMs = p.updatedAt ? now - new Date(p.updatedAt).getTime() : Infinity;
        const isNew = createdMs < 7 * 24 * 60 * 60 * 1000
          && (p.updatedAt && p.createdAt
            ? Math.abs(new Date(p.createdAt).getTime() - new Date(p.updatedAt).getTime()) < 24 * 60 * 60 * 1000
            : true);
        const isUpdated = !isNew && updatedMs < 24 * 60 * 60 * 1000;
        if (filters.status === "new" && !isNew) return false;
        if (filters.status === "updated" && !isUpdated) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !p.symbol.toLowerCase().includes(q) &&
          !p.name.toLowerCase().includes(q) &&
          !(p.isin && p.isin.toLowerCase().includes(q)) &&
          !(p.wkn && p.wkn.toLowerCase().includes(q)) &&
          !p.exchange.toLowerCase().includes(q) &&
          !p.sector.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });

    // Sort
    const dir = filters.sortDir === "asc" ? 1 : -1;
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case "name": return dir * a.name.localeCompare(b.name);
        case "price": return dir * (a.price - b.price);
        case "analysts": return dir * (a.analysts - b.analysts);
        case "conviction": {
          const ca = a.buys + a.holds + a.sells > 0 ? (a.buys - a.sells) / (a.buys + a.holds + a.sells) : 0;
          const cb = b.buys + b.holds + b.sells > 0 ? (b.buys - b.sells) / (b.buys + b.holds + b.sells) : 0;
          return dir * (ca - cb);
        }
        case "dividendYield": return dir * ((a.dividendYield ?? 0) - (b.dividendYield ?? 0));
        case "upside":
        default: return dir * (a.upside - b.upside);
      }
    });

    return result;
  }, [stocks, filters]);

  const avgUpside =
    stocks.length > 0 ? stocks.reduce((sum, p) => sum + p.upside, 0) / stocks.length : 0;
  const avgAnalysts =
    stocks.length > 0 ? stocks.reduce((sum, p) => sum + p.analysts, 0) / stocks.length : 0;
  const maxUpside =
    stocks.length > 0 ? Math.max(...stocks.map((p) => p.upside)) : 35;

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

      <p className="text-xs text-text-tertiary">{t("eodDisclaimer")}</p>

      <StockFilterBar
        filters={filters}
        onChange={handleFilterChange}
        resultCount={filtered.length}
        sectors={sectors}
        maxUpside={maxUpside}
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
      ) : filters.viewMode === "list" ? (
        <>
          <div className="hidden md:flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1 text-[10px] sm:text-xs uppercase text-text-tertiary">
            <span className="w-14 sm:w-20">Symbol</span>
            <span className="flex-1">Name</span>
            <span className="hidden md:block w-24 text-right">Price</span>
            <span className="hidden md:block w-24 text-right">Target</span>
            <span className="w-14 sm:w-16 text-right">Upside</span>
            <span className="hidden lg:block w-12 text-right">Analysts</span>
            <span className="hidden lg:block w-16 text-right">Conv.</span>
            <span className="hidden xl:block w-24">Sector</span>
            <span className="hidden sm:block w-14">Risk</span>
            <span className="hidden xl:block w-28">ISIN</span>
          </div>
          <div className="space-y-1">
            {filtered.slice(0, visibleCount).map((pick) => (
              <TickerRow
                key={pick.symbol}
                pick={pick}
                locked={tier === "free" && !freeSymbols.has(pick.symbol)}
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
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, visibleCount).map((pick) => (
              <TickerCard
                key={pick.symbol}
                pick={pick}
                locked={tier === "free" && !freeSymbols.has(pick.symbol)}
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

      <Card variant="accent" className="flex items-center gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-lg">
          {"\u26A1"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text-primary">
            {t("mixCta")}
          </div>
          <div className="text-xs text-text-secondary">
            {t("mixCtaSubtitle")}
          </div>
        </div>
        <Link href="/dashboard/mix">
          <Badge variant="accent" className="cursor-pointer whitespace-nowrap">
            Auto-Mix {"\u2192"}
          </Badge>
        </Link>
      </Card>

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
