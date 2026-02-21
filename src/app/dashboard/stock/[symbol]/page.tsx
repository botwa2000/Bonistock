"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { StockPick } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const t = useTranslations("stock");
  const [pick, setPick] = useState<StockPick | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/stocks/${encodeURIComponent(symbol)}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setPick(data);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
      </div>
    );
  }

  if (notFound || !pick) {
    return (
      <div className="flex h-64 items-center justify-center text-text-secondary">
        Stock not found.{" "}
        <Link href="/dashboard" className="ml-2 text-emerald-300 hover:underline">
          {t("backToList")}
        </Link>
      </div>
    );
  }

  const total = pick.buys + pick.holds + pick.sells;
  const conviction = total > 0 ? ((pick.buys - pick.sells) / total) * 100 : 0;

  const riskVariant =
    pick.risk === "low" ? "success" : pick.risk === "high" ? "danger" : "warning";

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        &larr; {t("backToList")}
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-text-primary">{pick.symbol}</h1>
            <Badge variant={riskVariant}>{pick.risk} risk</Badge>
            {pick.belowSma200 && <Badge variant="warning">Below SMA 200</Badge>}
          </div>
          <p className="mt-1 text-lg text-text-secondary">{pick.name}</p>
          <p className="mt-1 text-sm text-text-tertiary">{pick.sector}</p>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div>
            <div className="text-xs uppercase text-text-secondary">Price</div>
            <div className="text-2xl font-semibold text-text-primary">
              ${pick.price.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-secondary">{t("priceTarget")}</div>
            <div className="text-2xl font-semibold text-emerald-300">
              ${pick.target.toFixed(0)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-secondary">{t("upside")}</div>
            <div className="text-2xl font-semibold text-emerald-300">
              +{pick.upside}%
            </div>
          </div>
        </div>
      </div>

      {pick.belowSma200 && (
        <Card variant="outline" className="border-amber-400/30 bg-amber-400/5">
          <p className="text-sm text-amber-200">{t("trendWarning")}</p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card variant="glass" padding="lg">
            <h2 className="text-lg font-semibold text-text-primary">
              {t("whyThisPick")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {pick.whyThisPick}
            </p>
          </Card>

          <Card variant="glass" padding="lg">
            <h2 className="text-lg font-semibold text-text-primary">
              Price Chart
            </h2>
            <div className="mt-4 flex h-48 items-center justify-center rounded-xl border border-border-subtle bg-surface-elevated text-sm text-text-tertiary">
              Chart placeholder — historical price data will render here
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card variant="glass">
            <h3 className="text-base font-semibold text-text-primary">
              {t("analystBreakdown")}
            </h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-300" />
                  {t("buy")}
                </div>
                <span className="font-semibold text-text-primary">{pick.buys}</span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-surface">
                <div
                  className="bg-emerald-400"
                  style={{ width: `${(pick.buys / total) * 100}%` }}
                />
                <div
                  className="bg-amber-400"
                  style={{ width: `${(pick.holds / total) * 100}%` }}
                />
                <div
                  className="bg-rose-400"
                  style={{ width: `${(pick.sells / total) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-300" />
                  {t("hold")}
                </div>
                <span className="font-semibold text-text-primary">{pick.holds}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-300" />
                  {t("sell")}
                </div>
                <span className="font-semibold text-text-primary">{pick.sells}</span>
              </div>
            </div>
            <div className="mt-4 border-t border-border-subtle pt-4 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Total {t("analysts")}</span>
                <span className="text-text-primary">{pick.analysts}</span>
              </div>
              <div className="mt-2 flex justify-between text-text-secondary">
                <span>{t("conviction")}</span>
                <span className="font-semibold text-emerald-300">
                  {conviction.toFixed(0)}%
                </span>
              </div>
              <div className="mt-2 flex justify-between text-text-secondary">
                <span>{t("horizon")}</span>
                <span className="text-text-primary">{pick.horizon}</span>
              </div>
            </div>
          </Card>

          <div className="flex gap-2">
            <Button fullWidth>{t("addToMix")}</Button>
            <Button variant="secondary" fullWidth>
              {t("addToWatchlist")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
