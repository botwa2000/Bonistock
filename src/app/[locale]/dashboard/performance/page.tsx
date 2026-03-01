"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/currency";

interface PickPerf {
  symbol: string;
  name: string;
  sector: string;
  risk: string;
  entryPrice: number;
  currentPrice: number;
  entryDate: string;
  returnPct: number;
}

interface WatchlistPerf {
  symbol: string;
  name: string;
  entryPrice: number;
  currentPrice: number;
  addedAt: string;
  returnPct: number;
}

interface PerfData {
  picks: PickPerf[];
  summary: { total: number; winners: number; winRate: number; avgReturn: number };
  watchlist: WatchlistPerf[];
}

type SortKey = "returnPct" | "symbol" | "name" | "entryDate";

export default function PerformancePage() {
  const t = useTranslations("performance");
  const { user } = useAuth();
  const tier = user?.tier ?? "free";

  const [data, setData] = useState<PerfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<"picks" | "watchlist">("picks");
  const [sortKey, setSortKey] = useState<SortKey>("returnPct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetch("/api/stocks/performance")
      .then((r) => {
        if (!r.ok) { setError(true); setLoading(false); return null; }
        return r.json();
      })
      .then((d) => { if (d) setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const sortedPicks = useMemo(() => {
    if (!data) return [];
    const dir = sortDir === "asc" ? 1 : -1;
    return [...data.picks].sort((a, b) => {
      switch (sortKey) {
        case "symbol": return dir * a.symbol.localeCompare(b.symbol);
        case "name": return dir * a.name.localeCompare(b.name);
        case "entryDate": return dir * a.entryDate.localeCompare(b.entryDate);
        case "returnPct":
        default: return dir * (a.returnPct - b.returnPct);
      }
    });
  }, [data, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "returnPct" ? "desc" : "asc");
    }
  };

  if (tier === "free") {
    return (
      <div className="space-y-6">
        <SectionHeader title={t("title")} subtitle={t("subtitle")} />
        <Card variant="glass" className="py-12 text-center space-y-3">
          <p className="text-text-secondary">{t("plusRequired")}</p>
          <Link href="/pricing">
            <Button>{t("upgradeCta")}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <SectionHeader title={t("title")} subtitle={t("subtitle")} />
        <Card variant="glass" className="py-12 text-center">
          <p className="text-text-secondary">{t("loadError")}</p>
        </Card>
      </div>
    );
  }

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " \u2191" : " \u2193") : "";

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Badge variant="accent">
            {t("winRate")}: {data.summary.winRate}%
          </Badge>
        }
      />

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card variant="glass">
          <div className="text-xs uppercase text-text-secondary">{t("avgReturn")}</div>
          <div className={`mt-1 text-2xl font-semibold ${data.summary.avgReturn >= 0 ? "text-accent-fg" : "text-rose-400"}`}>
            {data.summary.avgReturn >= 0 ? "+" : ""}{data.summary.avgReturn}%
          </div>
        </Card>
        <Card variant="glass">
          <div className="text-xs uppercase text-text-secondary">{t("winRate")}</div>
          <div className="mt-1 text-2xl font-semibold text-text-primary">{data.summary.winRate}%</div>
        </Card>
        <Card variant="glass">
          <div className="text-xs uppercase text-text-secondary">{t("totalPicks")}</div>
          <div className="mt-1 text-2xl font-semibold text-text-primary">{data.summary.total}</div>
        </Card>
        <Card variant="glass">
          <div className="text-xs uppercase text-text-secondary">{t("winners")}</div>
          <div className="mt-1 text-2xl font-semibold text-accent-fg">{data.summary.winners}</div>
        </Card>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2">
        <button
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "picks"
              ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/30"
              : "bg-surface text-text-secondary border border-border hover:text-text-primary"
          }`}
          onClick={() => setTab("picks")}
        >
          {t("ourPicks")}
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "watchlist"
              ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/30"
              : "bg-surface text-text-secondary border border-border hover:text-text-primary"
          }`}
          onClick={() => setTab("watchlist")}
        >
          {t("myWatchlist")}
        </button>
      </div>

      {tab === "picks" ? (
        <>
          {/* Sortable picks table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-text-tertiary">
                  <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort("symbol")}>
                    {t("symbol")}{sortArrow("symbol")}
                  </th>
                  <th className="cursor-pointer px-3 py-2 hidden md:table-cell" onClick={() => toggleSort("name")}>
                    {t("name")}{sortArrow("name")}
                  </th>
                  <th className="px-3 py-2 hidden lg:table-cell">{t("sector")}</th>
                  <th className="px-3 py-2 hidden lg:table-cell">{t("risk")}</th>
                  <th className="px-3 py-2 text-right">{t("entryPrice")}</th>
                  <th className="px-3 py-2 text-right">{t("currentPrice")}</th>
                  <th className="cursor-pointer px-3 py-2 text-right" onClick={() => toggleSort("returnPct")}>
                    {t("return")}{sortArrow("returnPct")}
                  </th>
                  <th className="cursor-pointer px-3 py-2 hidden sm:table-cell" onClick={() => toggleSort("entryDate")}>
                    {t("since")}{sortArrow("entryDate")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPicks.map((p) => (
                  <tr key={p.symbol} className="border-b border-border-subtle hover:bg-surface-elevated/50">
                    <td className="px-3 py-2">
                      <Link href={`/dashboard/stock/${p.symbol}`} className="font-semibold text-text-primary hover:text-accent-fg">
                        {p.symbol}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-text-secondary hidden md:table-cell truncate max-w-[200px]">{p.name}</td>
                    <td className="px-3 py-2 text-text-tertiary hidden lg:table-cell">{p.sector}</td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      <Badge variant={p.risk === "low" ? "success" : p.risk === "high" ? "danger" : "warning"}>
                        {p.risk}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-text-secondary">{formatPrice(p.entryPrice)}</td>
                    <td className="px-3 py-2 text-right text-text-primary">{formatPrice(p.currentPrice)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${p.returnPct >= 0 ? "text-accent-fg" : "text-rose-400"}`}>
                      {p.returnPct >= 0 ? "+" : ""}{p.returnPct}%
                    </td>
                    <td className="px-3 py-2 text-text-tertiary hidden sm:table-cell">{p.entryDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sortedPicks.length === 0 && (
            <Card variant="glass" className="py-8 text-center">
              <p className="text-text-secondary">{t("noData")}</p>
            </Card>
          )}
        </>
      ) : (
        <>
          {data.watchlist.length === 0 ? (
            <Card variant="glass" className="py-8 text-center space-y-3">
              <p className="text-text-secondary">{t("watchlistEmpty")}</p>
              <Link href="/dashboard/watchlist">
                <Button variant="secondary">{t("goToWatchlist")}</Button>
              </Link>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-text-tertiary">
                    <th className="px-3 py-2">{t("symbol")}</th>
                    <th className="px-3 py-2 hidden md:table-cell">{t("name")}</th>
                    <th className="px-3 py-2 text-right">{t("entryPrice")}</th>
                    <th className="px-3 py-2 text-right">{t("currentPrice")}</th>
                    <th className="px-3 py-2 text-right">{t("return")}</th>
                    <th className="px-3 py-2 hidden sm:table-cell">{t("addedOn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.watchlist.map((w) => (
                    <tr key={w.symbol} className="border-b border-border-subtle hover:bg-surface-elevated/50">
                      <td className="px-3 py-2">
                        <Link href={`/dashboard/stock/${w.symbol}`} className="font-semibold text-text-primary hover:text-accent-fg">
                          {w.symbol}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-text-secondary hidden md:table-cell truncate max-w-[200px]">{w.name}</td>
                      <td className="px-3 py-2 text-right text-text-secondary">{formatPrice(w.entryPrice)}</td>
                      <td className="px-3 py-2 text-right text-text-primary">{formatPrice(w.currentPrice)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${w.returnPct >= 0 ? "text-accent-fg" : "text-rose-400"}`}>
                        {w.returnPct >= 0 ? "+" : ""}{w.returnPct}%
                      </td>
                      <td className="px-3 py-2 text-text-tertiary hidden sm:table-cell">{w.addedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
