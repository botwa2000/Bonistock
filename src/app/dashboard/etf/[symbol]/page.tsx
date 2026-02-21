"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { EtfPick } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
          className="ml-2 text-emerald-300 hover:underline"
        >
          {t("backToList")}
        </Link>
      </div>
    );
  }

  const metrics = [
    { label: t("cagr1y"), value: `${etf.cagr1y}%`, positive: etf.cagr1y > 0 },
    { label: t("cagr3y"), value: `${etf.cagr3y}%`, positive: etf.cagr3y > 0 },
    { label: t("cagr5y"), value: `${etf.cagr5y}%`, positive: etf.cagr5y > 0 },
    { label: t("maxDrawdown"), value: `${etf.drawdown}%`, positive: false },
    { label: t("expenseRatio"), value: `${etf.fee}%`, positive: true },
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
          <Badge className="mt-2">{etf.theme}</Badge>
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
              className={`mt-1 text-2xl font-semibold ${m.positive ? "text-emerald-300" : "text-rose-200"}`}
            >
              {m.value}
            </div>
          </Card>
        ))}
      </div>

      <Card variant="glass" padding="lg">
        <h2 className="text-lg font-semibold text-text-primary">
          Historical Performance
        </h2>
        <div className="mt-4 flex h-48 items-center justify-center rounded-xl border border-border-subtle bg-surface-elevated text-sm text-text-tertiary">
          Chart placeholder — historical NAV data will render here
        </div>
      </Card>

      <Link href="/dashboard/mix">
        <Button>Add to Auto-Mix</Button>
      </Link>
    </div>
  );
}
