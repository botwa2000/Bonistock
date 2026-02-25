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
  const td = useTranslations("dashboard");
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
        <Link href="/dashboard" className="ml-2 text-accent-fg hover:underline">
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
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-tertiary">
            <span>{pick.sector}</span>
            {pick.isin && <Badge variant="default">ISIN: {pick.isin}</Badge>}
            {pick.wkn && <Badge variant="default">WKN: {pick.wkn}</Badge>}
          </div>
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
            <div className="text-2xl font-semibold text-accent-fg">
              ${pick.target.toFixed(0)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-secondary">{t("upside")}</div>
            <div className="text-2xl font-semibold text-accent-fg">
              +{pick.upside}%
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-text-tertiary">{td("eodDisclaimer")}</p>

      {pick.belowSma200 && (
        <Card variant="outline" className="border-amber-400/30 bg-amber-400/5">
          <p className="text-sm text-warning-fg">{t("trendWarning")}</p>
        </Card>
      )}

      {pick.description && (
        <Card variant="glass" padding="lg">
          <h2 className="text-lg font-semibold text-text-primary">
            {t("description")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {pick.description}
          </p>
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
        </div>

        <div className="space-y-4">
          <Card variant="glass">
            <h3 className="text-base font-semibold text-text-primary">
              {t("keyDetails")}
            </h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>{t("dividendYield")}</span>
                <span className="text-text-primary">
                  {pick.dividendYield > 0 ? `${pick.dividendYield.toFixed(2)}%` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>{t("marketCap")}</span>
                <span className="text-text-primary capitalize">{pick.marketCap}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>{t("exchange")}</span>
                <span className="text-text-primary">{pick.exchange}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>{t("currency")}</span>
                <span className="text-text-primary">{pick.currency}</span>
              </div>
              {pick.isin && (
                <div className="flex justify-between text-text-secondary">
                  <span>ISIN</span>
                  <span className="text-text-primary">{pick.isin}</span>
                </div>
              )}
              {pick.wkn && (
                <div className="flex justify-between text-text-secondary">
                  <span>WKN</span>
                  <span className="text-text-primary">{pick.wkn}</span>
                </div>
              )}
            </div>
          </Card>

          {pick.brokerAvailability && pick.brokerAvailability.length > 0 && (
            <Card variant="glass">
              <h3 className="text-xs uppercase text-text-secondary">{t("brokerAvailability")}</h3>
              <div className="mt-2 flex flex-wrap gap-1">
                {pick.brokerAvailability.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-text-tertiary"
                  >
                    {b === "ibkr" ? "IBKR" : b === "t212" ? "T212" : b === "robinhood" ? "RH" : b === "etoro" ? "eToro" : b === "fidelity" ? "Fidelity" : b === "schwab" ? "Schwab" : b === "webull" ? "Webull" : b === "traderepublic" ? "Trade Republic" : b === "scalable" ? "Scalable" : b === "ing" ? "ING" : b === "comdirect" ? "comdirect" : b}
                  </span>
                ))}
              </div>
            </Card>
          )}

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
                <span className="font-semibold text-accent-fg">
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
