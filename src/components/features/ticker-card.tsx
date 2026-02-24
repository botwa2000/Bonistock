"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { StockPick } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRegionFlag, getSectorIcon } from "@/lib/stock-icons";
import { StockInfoPopup } from "@/components/features/stock-info-popup";
import { hapticImpact } from "@/lib/native";

interface TickerCardProps {
  pick: StockPick;
  compact?: boolean;
  locked?: boolean;
}

export function TickerCard({ pick, compact = false, locked = false }: TickerCardProps) {
  const t = useTranslations("stock");
  const [showInfo, setShowInfo] = useState(false);
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

  if (locked) {
    return (
      <div className="relative">
        <Card variant="glass" className="flex flex-col gap-2 sm:gap-3 select-none">
          <div className="blur-[6px] pointer-events-none opacity-40">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <Badge className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">{getRegionFlag(pick.region)}</Badge>
                  <Badge className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">{pick.exchange}</Badge>
                  <Badge className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">{getSectorIcon(pick.sector)} {pick.sector}</Badge>
                  <Badge className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">
                    {pick.analysts} {t("analysts")}
                  </Badge>
                </div>
                <h3 className="mt-1.5 sm:mt-2 text-sm sm:text-lg font-semibold text-text-primary truncate">
                  {pick.symbol} &middot; {pick.name}
                </h3>
                {!compact && (
                  <p className="text-xs sm:text-sm text-text-secondary">
                    $••• &middot; target $••• &middot; {pick.horizon}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[10px] sm:text-xs uppercase text-text-secondary">
                  {t("upside")}
                </div>
                <div className="text-xl sm:text-2xl font-semibold text-emerald-300">
                  +••%
                </div>
              </div>
            </div>

            {!compact && (
              <div className="flex items-center justify-between gap-1.5 sm:gap-3 rounded-xl border border-border-subtle bg-surface-elevated px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs text-text-secondary">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-300" />
                  •• {t("buy")}
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-300" />
                  •• {t("hold")}
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-rose-300" />
                  •• {t("sell")}
                </div>
                <Badge variant={riskVariant} className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">
                  {pick.risk} risk
                </Badge>
              </div>
            )}
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated/80 backdrop-blur-sm border border-border">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <Link
              href="/pricing"
              className="rounded-lg bg-emerald-400/90 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-emerald-300 transition-colors"
            >
              Unlock with Pass or Plus
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Link href={`/dashboard/stock/${pick.symbol}`} onClick={() => hapticImpact("light")}>
        <Card variant="glass" hover className="flex flex-col gap-2 sm:gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 overflow-hidden max-h-12">
                <Badge className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">{getRegionFlag(pick.region)}</Badge>
                <Badge className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">{pick.exchange}</Badge>
                <Badge className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">{getSectorIcon(pick.sector)} {pick.sector}</Badge>
                <Badge className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">
                  {pick.analysts} {t("analysts")}
                </Badge>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowInfo(true);
                  }}
                  className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full border border-border-subtle bg-surface-elevated text-[10px] sm:text-xs text-text-secondary hover:text-text-primary hover:border-emerald-400/50 transition-colors"
                  title={t("moreInfo")}
                >
                  i
                </button>
              </div>
              <h3 className="mt-1.5 sm:mt-2 text-sm sm:text-lg font-semibold text-text-primary truncate">
                {pick.symbol} &middot; {pick.name}
              </h3>
              {!compact && (
                <p className="text-xs sm:text-sm text-text-secondary truncate">
                  ${pick.price.toFixed(2)} &middot; target $
                  {pick.target.toFixed(0)} &middot; {pick.horizon}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] sm:text-xs uppercase text-text-secondary">
                {t("upside")}
              </div>
              <div className="text-xl sm:text-2xl font-semibold text-emerald-300">
                +{pick.upside}%
              </div>
              {!compact && (
                <>
                  <div className="mt-1 text-[10px] sm:text-xs text-text-secondary">
                    {t("conviction")}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-text-primary">
                    {(conviction * 100).toFixed(0)}%
                  </div>
                </>
              )}
            </div>
          </div>

          {!compact && (
            <div className="flex items-center justify-between gap-1.5 sm:gap-3 rounded-xl border border-border-subtle bg-surface-elevated px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs text-text-secondary">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-300" />
                {pick.buys} {t("buy")}
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-300" />
                {pick.holds} {t("hold")}
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-rose-300" />
                {pick.sells} {t("sell")}
              </div>
              <Badge variant={riskVariant} className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">
                {pick.risk} risk
              </Badge>
            </div>
          )}

          {pick.belowSma200 && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              {t("trendWarning")}
            </div>
          )}
        </Card>
      </Link>
      {showInfo && (
        <StockInfoPopup pick={pick} onClose={() => setShowInfo(false)} />
      )}
    </>
  );
}
