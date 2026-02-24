"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { brokers } from "@/lib/mock-data";
import type { StockFilters, EtfFilters, BrokerId, Region, RiskLevel, Horizon } from "@/lib/types";
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
    const def = defaultStockFilters[key as keyof StockFilters];
    return val !== def;
  }).length;

  const regionBrokers = brokers.filter((b) => b.regions.includes(region));

  return (
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
              onClick={(e) => { e.stopPropagation(); onChange(defaultStockFilters); }}
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
    const def = defaultEtfFilters[key as keyof EtfFilters];
    return val !== def;
  }).length;

  const regionBrokers = brokers.filter((b) => b.regions.includes(region));

  return (
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
              onClick={(e) => { e.stopPropagation(); onChange(defaultEtfFilters); }}
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
  );
}
