"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { StockPick } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TickerCardProps {
  pick: StockPick;
  compact?: boolean;
}

export function TickerCard({ pick, compact = false }: TickerCardProps) {
  const t = useTranslations("stock");
  const conviction =
    pick.buys + pick.holds + pick.sells > 0
      ? (pick.buys - pick.sells) / (pick.buys + pick.holds + pick.sells)
      : 0;

  const riskVariant =
    pick.risk === "low"
      ? "success"
      : pick.risk === "high"
        ? "danger"
        : "warning";

  return (
    <Link href={`/dashboard/stock/${pick.symbol}`}>
      <Card variant="glass" hover className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Badge>{pick.sector}</Badge>
              <Badge>
                {pick.analysts} {t("analysts")}
              </Badge>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-text-primary">
              {pick.symbol} &middot; {pick.name}
            </h3>
            {!compact && (
              <p className="text-sm text-text-secondary">
                ${pick.price.toFixed(2)} &middot; target $
                {pick.target.toFixed(0)} &middot; {pick.horizon}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-text-secondary">
              {t("upside")}
            </div>
            <div className="text-2xl font-semibold text-emerald-300">
              +{pick.upside}%
            </div>
            {!compact && (
              <>
                <div className="mt-1 text-xs text-text-secondary">
                  {t("conviction")}
                </div>
                <div className="text-sm font-semibold text-text-primary">
                  {(conviction * 100).toFixed(0)}%
                </div>
              </>
            )}
          </div>
        </div>

        {!compact && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-elevated px-3 py-2 text-xs text-text-secondary">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              {pick.buys} {t("buy")}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-300" />
              {pick.holds} {t("hold")}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-300" />
              {pick.sells} {t("sell")}
            </div>
            <Badge variant={riskVariant}>
              {pick.risk} risk
            </Badge>
          </div>
        )}

        {!compact && pick.brokerAvailability && pick.brokerAvailability.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pick.brokerAvailability.map((b) => (
              <span
                key={b}
                className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-text-tertiary"
              >
                {b === "ibkr" ? "IBKR" : b === "t212" ? "T212" : b === "robinhood" ? "RH" : "eToro"}
              </span>
            ))}
          </div>
        )}

        {pick.belowSma200 && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            {t("trendWarning")}
          </div>
        )}
      </Card>
    </Link>
  );
}
