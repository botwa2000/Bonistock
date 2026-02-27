"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { EtfPick } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getExchangeName } from "@/lib/exchange-names";

export default function EtfDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const t = useTranslations("etf");
  const [etf, setEtf] = useState<EtfPick | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/etfs/${encodeURIComponent(symbol)}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setEtf(data);
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

  if (notFound || !etf) {
    return (
      <div className="flex h-64 items-center justify-center text-text-secondary">
        ETF not found.{" "}
        <Link
          href="/dashboard/etfs"
          className="ml-2 text-accent-fg hover:underline"
        >
          {t("backToList")}
        </Link>
      </div>
    );
  }

  const metrics = [
    { label: t("cagr1y"), value: `${etf.cagr1y}%`, positive: etf.cagr1y > 0 },
    { label: t("cagr3y"), value: etf.cagr3y != null ? `${etf.cagr3y}%` : "N/A", positive: (etf.cagr3y ?? 0) > 0 },
    { label: t("cagr5y"), value: etf.cagr5y != null ? `${etf.cagr5y}%` : "N/A", positive: (etf.cagr5y ?? 0) > 0 },
    { label: t("maxDrawdown"), value: `${etf.drawdown}%`, positive: false },
    { label: t("expenseRatio"), value: etf.fee != null ? `${etf.fee}%` : "N/A", positive: true },
    { label: t("sharpe"), value: etf.sharpe.toFixed(2), positive: etf.sharpe > 0.7 },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/etfs"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        &larr; {t("backToList")}
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-text-primary">{etf.symbol}</h1>
            <Badge variant="info">ETF</Badge>
          </div>
          <p className="mt-1 text-lg text-text-secondary">{etf.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{etf.theme}</Badge>
            {etf.isin && <Badge variant="default">ISIN: {etf.isin}</Badge>}
            {etf.wkn && <Badge variant="default">WKN: {etf.wkn}</Badge>}
          </div>
        </div>
      </div>

      <Card variant="glass" padding="lg">
        <h2 className="text-lg font-semibold text-text-primary">{t("factSheet")}</h2>
        <p className="mt-2 text-sm text-text-secondary">{etf.description}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((m) => (
          <Card key={m.label} variant="glass">
            <div className="text-xs uppercase text-text-secondary">{m.label}</div>
            <div
              className={`mt-1 text-2xl font-semibold ${m.positive ? "text-accent-fg" : "text-danger-fg"}`}
            >
              {m.value}
            </div>
          </Card>
        ))}
      </div>

      <Card variant="glass">
        <h3 className="text-base font-semibold text-text-primary">
          {t("keyDetails")}
        </h3>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between text-text-secondary">
            <span>{t("exchange")}</span>
            <span className="text-text-primary">{getExchangeName(etf.exchange)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>{t("currency")}</span>
            <span className="text-text-primary">{etf.currency}</span>
          </div>
          {etf.isin && (
            <div className="flex justify-between text-text-secondary">
              <span>ISIN</span>
              <span className="text-text-primary">{etf.isin}</span>
            </div>
          )}
          {etf.wkn && (
            <div className="flex justify-between text-text-secondary">
              <span>WKN</span>
              <span className="text-text-primary">{etf.wkn}</span>
            </div>
          )}
        </div>
      </Card>

      {etf.brokerAvailability && etf.brokerAvailability.length > 0 && (
        <Card variant="glass">
          <h3 className="text-xs uppercase text-text-secondary">{t("brokerAvailability")}</h3>
          <div className="mt-2 flex flex-wrap gap-1">
            {etf.brokerAvailability.map((b) => (
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

      <Link href="/dashboard/mix">
        <Button>Add to Auto-Mix</Button>
      </Link>
    </div>
  );
}
