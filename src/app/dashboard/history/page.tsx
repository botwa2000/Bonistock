"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { UpgradePaywall } from "@/components/features/upgrade-paywall";
import type { StockHistoryItem, StockHistoryTimeline } from "@/lib/types";

interface RecurringStock {
  symbol: string;
  name: string;
  count: number;
  avgUpside: number;
}

interface HistoryResponse {
  stocks: StockHistoryItem[];
  totalItems: number;
  page: number;
  totalPages: number;
  sectors: string[];
  recurring: RecurringStock[];
}

export default function HistoryPage() {
  const t = useTranslations("history");
  const { user } = useAuth();
  const tier = user?.tier ?? "free";
  const passWindowActive = user?.passWindowActive ?? false;

  const [data, setData] = useState<HistoryResponse | null>(null);
  const [stocks, setStocks] = useState<StockHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [sortBy, setSortBy] = useState("appearances");

  // Expanded row timeline
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<StockHistoryTimeline[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const buildUrl = useCallback((p: number) => {
    const params = new URLSearchParams({ view: "stocks", page: String(p) });
    if (search) params.set("search", search);
    if (sector) params.set("sector", sector);
    if (dateRange !== "all") params.set("dateRange", dateRange);
    if (sortBy !== "appearances") params.set("sortBy", sortBy);
    return `/api/stocks/history?${params}`;
  }, [search, sector, dateRange, sortBy]);

  const fetchPage = useCallback(async (p: number, append = false) => {
    const res = await fetch(buildUrl(p));
    if (!res.ok) return;
    const result = (await res.json()) as HistoryResponse;
    setData(result);
    if (append) {
      setStocks((prev) => [...prev, ...result.stocks]);
    } else {
      setStocks(result.stocks);
    }
    setPage(p);
    setHasMore(p < result.totalPages);
  }, [buildUrl]);

  const blocked = tier === "free" || (tier === "pass" && !passWindowActive);

  // Initial load + filter changes
  useEffect(() => {
    if (blocked) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setExpandedSymbol(null);
    fetchPage(1).finally(() => setLoading(false));
  }, [blocked, fetchPage]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchPage(page + 1, true);
    setLoadingMore(false);
  };

  const handleExpand = async (symbol: string) => {
    if (expandedSymbol === symbol) {
      setExpandedSymbol(null);
      return;
    }
    setExpandedSymbol(symbol);
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/stocks/history?view=timeline&symbol=${symbol}`);
      if (res.ok) {
        const result = await res.json();
        setTimeline(result.timeline ?? []);
      }
    } finally {
      setTimelineLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{t("title")}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t("subtitle")}</p>
        </div>
        <UpgradePaywall feature={t("title")} />
      </div>
    );
  }

  const recurring = data?.recurring ?? [];
  const sectors = data?.sectors ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{t("title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("subtitle")}</p>
      </div>

      {/* Most Recurring Section */}
      {recurring.length > 0 && (
        <>
          <SectionHeader overline={t("recurring")} title="" />
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {recurring.map((stock) => (
              <Card key={stock.symbol} variant="glass" padding="sm">
                <div className="text-sm font-semibold text-text-primary">
                  {stock.symbol}
                </div>
                <div className="text-xs text-text-secondary truncate">
                  {stock.name}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="accent" className="text-[10px]">
                    {t("pickedTimes", { count: stock.count })}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-text-tertiary">
                  {t("avgUpside", { value: stock.avgUpside })}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full sm:w-56 rounded-lg border border-input-border bg-input-bg px-3 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-emerald-300/70 transition-colors"
        />
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="rounded-lg border border-input-border bg-input-bg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-emerald-300/70"
        >
          <option value="">{t("allSectors")}</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {(["all", "7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                dateRange === range
                  ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                  : "bg-surface text-text-secondary border border-border hover:text-text-primary"
              }`}
            >
              {range === "all" ? t("allDates") : t(`last${range}` as "last7d" | "last30d" | "last90d")}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-input-border bg-input-bg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-emerald-300/70"
        >
          <option value="appearances">{t("sortByAppearances")}</option>
          <option value="latestUpside">{t("sortByLatestUpside")}</option>
          <option value="avgUpside">{t("sortByAvgUpside")}</option>
          <option value="name">{t("sortByName")}</option>
        </select>
      </div>

      {/* Stock List */}
      {stocks.length === 0 && !loading ? (
        <Card variant="glass" className="py-12 text-center">
          <p className="text-text-secondary">{t("noHistory")}</p>
        </Card>
      ) : (
        <div className="space-y-1">
          {/* Table header — desktop only */}
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 text-[11px] uppercase text-text-tertiary font-medium">
            <span className="w-20">{t("symbol")}</span>
            <span className="flex-1">{t("name")}</span>
            <span className="w-16 text-right">{t("timesPicked")}</span>
            <span className="w-16 text-right">{t("latestUpside")}</span>
            <span className="w-16 text-right">{t("avgUpside", { value: "" }).replace(": %", "")}</span>
            <span className="hidden lg:block w-24">{t("firstPicked")}</span>
            <span className="hidden lg:block w-24">{t("lastPicked")}</span>
          </div>

          {stocks.map((stock) => (
            <div key={stock.symbol}>
              {/* Desktop row */}
              <button
                onClick={() => handleExpand(stock.symbol)}
                className="hidden md:flex w-full items-center gap-3 rounded-xl border border-border bg-surface hover:bg-surface-elevated transition-colors px-3 py-2.5 text-sm text-left"
              >
                <span className="w-20 font-semibold text-text-primary truncate">{stock.symbol}</span>
                <span className="flex-1 min-w-0 text-text-secondary truncate">{stock.name}</span>
                <span className="w-16 text-right">
                  <Badge variant="accent" className="text-[10px]">{stock.appearances}x</Badge>
                </span>
                <span className="w-16 text-right font-semibold text-accent-fg">+{stock.latestUpside}%</span>
                <span className="w-16 text-right text-text-secondary">+{stock.avgUpside}%</span>
                <span className="hidden lg:block w-24 text-xs text-text-tertiary">{stock.firstDate}</span>
                <span className="hidden lg:block w-24 text-xs text-text-tertiary">{stock.lastDate}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 text-text-tertiary transition-transform ${expandedSymbol === stock.symbol ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                </svg>
              </button>

              {/* Mobile card */}
              <button
                onClick={() => handleExpand(stock.symbol)}
                className="md:hidden w-full rounded-xl border border-border bg-surface hover:bg-surface-elevated transition-colors px-3 py-3 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-text-primary">{stock.symbol}</div>
                    <div className="text-xs text-text-secondary truncate">{stock.name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-semibold text-accent-fg">+{stock.latestUpside}%</div>
                    <Badge variant="accent" className="text-[10px]">{stock.appearances}x</Badge>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-text-tertiary">
                  <span>{t("avgUpside", { value: stock.avgUpside })}</span>
                  <span>{stock.sector}</span>
                </div>
              </button>

              {/* Expanded timeline */}
              {expandedSymbol === stock.symbol && (
                <div className="ml-2 md:ml-8 mt-1 mb-2 rounded-lg border border-border-subtle bg-surface-elevated p-3">
                  <div className="text-xs font-medium text-text-secondary mb-2">{t("timeline")}</div>
                  {timelineLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
                    </div>
                  ) : timeline.length === 0 ? (
                    <div className="text-xs text-text-tertiary py-2">No timeline data.</div>
                  ) : (
                    <div className="space-y-0.5">
                      {/* Timeline header */}
                      <div className="hidden sm:flex items-center gap-2 px-2 py-1 text-[10px] uppercase text-text-tertiary">
                        <span className="w-20">Date</span>
                        <span className="w-16 text-right">{t("price")}</span>
                        <span className="w-16 text-right">{t("target")}</span>
                        <span className="w-14 text-right">{t("upside")}</span>
                        <span className="w-14 text-right">{t("analysts")}</span>
                        <span className="w-16">{t("risk")}</span>
                      </div>
                      {timeline.map((entry) => (
                        <div
                          key={entry.date}
                          className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-surface/50"
                        >
                          <span className="w-20 text-text-tertiary">{entry.date}</span>
                          <span className="w-16 text-right text-text-secondary">${entry.price}</span>
                          <span className="w-16 text-right text-text-secondary">${entry.target}</span>
                          <span className="w-14 text-right font-semibold text-accent-fg">+{entry.upside}%</span>
                          <span className="w-14 text-right text-text-secondary">{entry.analysts}</span>
                          <Badge
                            variant={entry.risk === "low" ? "success" : entry.risk === "high" ? "danger" : "warning"}
                            className="text-[10px] px-1.5 py-0.5"
                          >
                            {entry.risk}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "..." : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
