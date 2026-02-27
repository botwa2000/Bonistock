"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { brokers } from "@/lib/mock-data";
import type { StockFilters, EtfFilters, BrokerId, Region, RiskLevel, Horizon, StockSortBy, EtfSortBy, SortDir, ViewMode } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";

// ── Stock filters ──

interface StockFilterBarProps {
  filters: StockFilters;
  onChange: (filters: StockFilters) => void;
  resultCount: number;
  sectors: string[];
  maxUpside?: number;
}

const defaultStockFilters: StockFilters = {
  region: "all",
  sector: "all",
  risk: "any",
  horizon: "any",
  minUpside: 0,
  minAnalysts: 0,
  maxPrice: 10000,
  broker: "any",
  marketCap: "any",
  dividendOnly: false,
  search: "",
  sortBy: "upside",
  sortDir: "desc",
  viewMode: "grid",
};

export { defaultStockFilters };

export function StockFilterBar({
  filters,
  onChange,
  resultCount,
  sectors,
  maxUpside = 35,
}: StockFilterBarProps) {
  const t = useTranslations("filters");
  const { user } = useAuth();
  const region = (user?.region ?? "US").toLowerCase() as "us" | "de";
  const [collapsed, setCollapsed] = useState(true);

  const set = <K extends keyof StockFilters>(key: K, value: StockFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const activeCount = Object.entries(filters).filter(([key, val]) => {
    if (key === "search" || key === "sortBy" || key === "sortDir" || key === "viewMode") return false;
    const def = defaultStockFilters[key as keyof StockFilters];
    return val !== def;
  }).length;

  const regionBrokers = brokers.filter((b) => b.regions.includes(region));

  return (
    <div className="space-y-3">
      {/* Search + Sort + View always visible */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 pl-9 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-fg focus:outline-none"
          />
        </div>
        <Select
          label=""
          id="stock-sort"
          value={filters.sortBy}
          onChange={(v) => set("sortBy", v as StockSortBy)}
          options={[
            { value: "upside", label: t("sortUpside") },
            { value: "name", label: t("sortName") },
            { value: "price", label: t("sortPrice") },
            { value: "analysts", label: t("sortAnalysts") },
            { value: "conviction", label: t("sortConviction") },
            { value: "dividendYield", label: t("sortDividend") },
          ]}
        />
        <button
          type="button"
          onClick={() => set("sortDir", filters.sortDir === "asc" ? "desc" : "asc")}
          className="rounded-lg border border-border bg-surface-elevated p-2 text-text-secondary hover:text-text-primary transition-colors"
          title={filters.sortDir === "asc" ? "Ascending" : "Descending"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${filters.sortDir === "asc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => set("viewMode", "grid")}
            className={`p-2 transition-colors ${filters.viewMode === "grid" ? "bg-accent-fg/20 text-accent-fg" : "bg-surface-elevated text-text-secondary hover:text-text-primary"}`}
            title="Grid view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => set("viewMode", "list")}
            className={`p-2 transition-colors ${filters.viewMode === "list" ? "bg-accent-fg/20 text-accent-fg" : "bg-surface-elevated text-text-secondary hover:text-text-primary"}`}
            title="List view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Collapsible filters */}
      <Card variant="glass" padding="md" className="space-y-4">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h3 className="text-sm font-semibold text-text-primary">{t("title")}</h3>
            <Badge variant="accent">
              {resultCount} {t("results")}
            </Badge>
            {activeCount > 0 && (
              <Badge variant="warning">{activeCount} active</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onChange({ ...defaultStockFilters, search: filters.search, sortBy: filters.sortBy, sortDir: filters.sortDir, viewMode: filters.viewMode }); }}
              >
                {t("reset")}
              </Button>
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 text-text-secondary transition-transform ${collapsed ? "" : "rotate-180"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {!collapsed && (
          <>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
              <Select
                label={t("region")}
                id="filter-region"
                value={filters.region}
                onChange={(v) => set("region", v as Region | "all")}
                options={[
                  { value: "all", label: t("regionAll") },
                  { value: "us", label: t("regionUs") },
                  { value: "europe", label: t("regionEurope") },
                  { value: "em", label: t("regionEm") },
                ]}
              />
              <Select
                label={t("sector")}
                id="filter-sector"
                value={filters.sector}
                onChange={(v) => set("sector", v)}
                options={[
                  { value: "all", label: t("sectorAll") },
                  ...sectors.map((s) => ({ value: s, label: s })),
                ]}
              />
              <Select
                label={t("risk")}
                id="filter-risk"
                value={filters.risk}
                onChange={(v) => set("risk", v as RiskLevel | "any")}
                options={[
                  { value: "any", label: t("riskAny") },
                  { value: "low", label: t("riskLow") },
                  { value: "balanced", label: t("riskBalanced") },
                  { value: "high", label: t("riskHigh") },
                ]}
              />
              <Select
                label={t("broker")}
                id="filter-broker"
                value={filters.broker}
                onChange={(v) => set("broker", v as BrokerId | "any")}
                options={[
                  { value: "any", label: t("brokerAny") },
                  ...regionBrokers.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
              <Select
                label={t("horizon")}
                id="filter-horizon"
                value={filters.horizon}
                onChange={(v) => set("horizon", v as Horizon | "any")}
                options={[
                  { value: "any", label: t("horizonAny") },
                  { value: "6M", label: "6 months" },
                  { value: "12M", label: "12 months" },
                  { value: "24M", label: "24 months" },
                ]}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
              <Select
                label={t("marketCap")}
                id="filter-cap"
                value={filters.marketCap}
                onChange={(v) =>
                  set("marketCap", v as StockFilters["marketCap"])
                }
                options={[
                  { value: "any", label: t("capAny") },
                  { value: "mega", label: t("capMega") + " (>$200B)" },
                  { value: "large", label: t("capLarge") + " ($10-200B)" },
                  { value: "mid", label: t("capMid") + " ($2-10B)" },
                  { value: "small", label: t("capSmall") + " (<$2B)" },
                ]}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-secondary" htmlFor="filter-upside">
                  {t("minUpside")} ({filters.minUpside}%)
                </label>
                <input
                  id="filter-upside"
                  type="range"
                  min={0}
                  max={maxUpside}
                  step={1}
                  value={filters.minUpside}
                  onChange={(e) => set("minUpside", Number(e.target.value))}
                  className="mt-1 w-full accent-emerald-400"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-secondary" htmlFor="filter-price">
                  {t("maxPrice")} (${filters.maxPrice.toLocaleString()})
                </label>
                <input
                  id="filter-price"
                  type="range"
                  min={50}
                  max={10000}
                  step={50}
                  value={filters.maxPrice}
                  onChange={(e) => set("maxPrice", Number(e.target.value))}
                  className="mt-1 w-full accent-emerald-400"
                />
              </div>

              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={filters.dividendOnly}
                    onChange={(e) => set("dividendOnly", e.target.checked)}
                    className="h-4 w-4 rounded border-input-border bg-input-bg accent-emerald-400"
                  />
                  {t("dividendOnly")}
                </label>
              </div>
            </div>

            {filters.broker !== "any" && (
              <p className="text-xs text-text-tertiary">{t("brokerNote")}</p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// ── ETF filters ──

interface EtfFilterBarProps {
  filters: EtfFilters;
  onChange: (filters: EtfFilters) => void;
  resultCount: number;
  themes: string[];
  maxCagr?: number;
}

const defaultEtfFilters: EtfFilters = {
  region: "all",
  theme: "all",
  minCagr: 0,
  broker: "any",
  search: "",
  sortBy: "cagr5y",
  sortDir: "desc",
  viewMode: "grid",
};

export { defaultEtfFilters };

export function EtfFilterBar({
  filters,
  onChange,
  resultCount,
  themes,
  maxCagr = 20,
}: EtfFilterBarProps) {
  const t = useTranslations("filters");
  const { user } = useAuth();
  const region = (user?.region ?? "US").toLowerCase() as "us" | "de";
  const [collapsed, setCollapsed] = useState(true);

  const set = <K extends keyof EtfFilters>(key: K, value: EtfFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const activeCount = Object.entries(filters).filter(([key, val]) => {
    if (key === "search" || key === "sortBy" || key === "sortDir" || key === "viewMode") return false;
    const def = defaultEtfFilters[key as keyof EtfFilters];
    return val !== def;
  }).length;

  const regionBrokers = brokers.filter((b) => b.regions.includes(region));

  return (
    <div className="space-y-3">
      {/* Search + Sort + View always visible */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 pl-9 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-fg focus:outline-none"
          />
        </div>
        <Select
          label=""
          id="etf-sort"
          value={filters.sortBy}
          onChange={(v) => set("sortBy", v as EtfSortBy)}
          options={[
            { value: "cagr5y", label: t("sortCagr") },
            { value: "name", label: t("sortName") },
            { value: "fee", label: t("sortFee") },
            { value: "drawdown", label: t("sortDrawdown") },
            { value: "sharpe", label: t("sortSharpe") },
          ]}
        />
        <button
          type="button"
          onClick={() => set("sortDir", filters.sortDir === "asc" ? "desc" : "asc")}
          className="rounded-lg border border-border bg-surface-elevated p-2 text-text-secondary hover:text-text-primary transition-colors"
          title={filters.sortDir === "asc" ? "Ascending" : "Descending"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${filters.sortDir === "asc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => set("viewMode", "grid")}
            className={`p-2 transition-colors ${filters.viewMode === "grid" ? "bg-accent-fg/20 text-accent-fg" : "bg-surface-elevated text-text-secondary hover:text-text-primary"}`}
            title="Grid view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => set("viewMode", "list")}
            className={`p-2 transition-colors ${filters.viewMode === "list" ? "bg-accent-fg/20 text-accent-fg" : "bg-surface-elevated text-text-secondary hover:text-text-primary"}`}
            title="List view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Collapsible filters */}
      <Card variant="glass" padding="md" className="space-y-4">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h3 className="text-sm font-semibold text-text-primary">{t("title")}</h3>
            <Badge variant="accent">
              {resultCount} {t("results")}
            </Badge>
            {activeCount > 0 && (
              <Badge variant="warning">{activeCount} active</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onChange({ ...defaultEtfFilters, search: filters.search, sortBy: filters.sortBy, sortDir: filters.sortDir, viewMode: filters.viewMode }); }}
              >
                {t("reset")}
              </Button>
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 text-text-secondary transition-transform ${collapsed ? "" : "rotate-180"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {!collapsed && (
          <>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
              <Select
                label={t("region")}
                id="etf-filter-region"
                value={filters.region}
                onChange={(v) => set("region", v as Region | "all")}
                options={[
                  { value: "all", label: t("regionAll") },
                  { value: "us", label: t("regionUs") },
                  { value: "europe", label: t("regionEurope") },
                  { value: "em", label: t("regionEm") },
                  { value: "global", label: t("regionGlobal") },
                ]}
              />
              <Select
                label={t("theme")}
                id="etf-filter-theme"
                value={filters.theme}
                onChange={(v) => set("theme", v)}
                options={[
                  { value: "all", label: t("themeAll") },
                  ...themes.map((th) => ({ value: th, label: th })),
                ]}
              />
              <Select
                label={t("broker")}
                id="etf-filter-broker"
                value={filters.broker}
                onChange={(v) => set("broker", v as BrokerId | "any")}
                options={[
                  { value: "any", label: t("brokerAny") },
                  ...regionBrokers.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-secondary" htmlFor="etf-filter-cagr">
                  {t("minCagr")} ({filters.minCagr}%)
                </label>
                <input
                  id="etf-filter-cagr"
                  type="range"
                  min={0}
                  max={maxCagr}
                  step={1}
                  value={filters.minCagr}
                  onChange={(e) => set("minCagr", Number(e.target.value))}
                  className="mt-1 w-full accent-emerald-400"
                />
              </div>
            </div>

            {filters.broker !== "any" && (
              <p className="text-xs text-text-tertiary">{t("brokerNote")}</p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
