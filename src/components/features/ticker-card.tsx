"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { StockPick } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRegionFlag, getSectorIcon } from "@/lib/stock-icons";
import { getExchangeName } from "@/lib/exchange-names";
import { formatPrice } from "@/lib/currency";
import { hapticImpact } from "@/lib/native";

interface TickerCardProps {
  pick: StockPick;
  compact?: boolean;
  locked?: boolean;
}

export function TickerCard({ pick, compact = false, locked = false }: TickerCardProps) {
  const t = useTranslations("stock");
  const conviction =
    pick.buys + pick.holds + pick.sells > 0
      ? (pick.buys - pick.sells) / (pick.buys + pick.holds + pick.sells)
      : 0;

  const now = Date.now();
  const createdMs = pick.createdAt ? now - new Date(pick.createdAt).getTime() : Infinity;
  const updatedMs = pick.updatedAt ? now - new Date(pick.updatedAt).getTime() : Infinity;
  // NEW: created < 7 days ago AND never updated by a subsequent run (createdAt ≈ updatedAt within 24h)
  const isNew = createdMs < 7 * 24 * 60 * 60 * 1000
    && (pick.updatedAt && pick.createdAt
      ? Math.abs(new Date(pick.createdAt).getTime() - new Date(pick.updatedAt).getTime()) < 24 * 60 * 60 * 1000
      : true);
  // Updated: updatedAt < 24h AND not NEW
  const isUpdated = !isNew && updatedMs < 24 * 60 * 60 * 1000;

  const riskVariant =
    pick.risk === "low"
      ? "success"
      : pick.risk === "high"
        ? "danger"
        : "warning";

  if (locked) {
    return (
      <div className="relative">
        <Card variant="glass" className="flex flex-col gap-2 sm:gap-3 select-none overflow-hidden">
          <div className="blur-[6px] pointer-events-none opacity-40">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <Badge className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">{getRegionFlag(pick.region)}</Badge>
                  <span title={getExchangeName(pick.exchange)}><Badge className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">{pick.exchange}</Badge></span>
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
              <div className="text-right shrink-0">
                <div className="text-[10px] sm:text-xs uppercase text-text-secondary">
                  {t("upside")}
                </div>
                <div className="text-xl sm:text-2xl font-semibold text-accent-fg">
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
      <Link href={`/dashboard/stock/${pick.symbol}`} onClick={() => hapticImpact("light")}>
        <Card variant="glass" hover className="flex flex-col gap-2 sm:gap-3 overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 overflow-hidden max-h-12">
                <Badge className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">{getRegionFlag(pick.region)}</Badge>
                <span title={getExchangeName(pick.exchange)}><Badge className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">{pick.exchange}</Badge></span>
                <Badge className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">{getSectorIcon(pick.sector)} {pick.sector}</Badge>
                <Badge className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">
                  {pick.analysts} {t("analysts")}
                </Badge>
                {isNew && <Badge variant="accent" className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">NEW</Badge>}
                {isUpdated && <Badge variant="info" className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-3 sm:py-1">Updated</Badge>}
              </div>
              <h3 className="mt-1.5 sm:mt-2 text-sm sm:text-lg font-semibold text-text-primary truncate">
                {pick.symbol} &middot; {pick.name}
              </h3>
              {!compact && (
                <p className="text-xs sm:text-sm text-text-secondary truncate">
                  {formatPrice(pick.price, pick.currency)} &middot; target {formatPrice(pick.target, pick.currency)} &middot; {pick.horizon}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] sm:text-xs uppercase text-text-secondary">
                {t("upside")}
              </div>
              <div className="text-xl sm:text-2xl font-semibold text-accent-fg">
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
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-warning-fg">
              {t("trendWarning")}
            </div>
          )}
        </Card>
      </Link>
  );
}

export function TickerRow({ pick, locked = false }: { pick: StockPick; locked?: boolean }) {
  const t = useTranslations("stock");

  const conviction =
    pick.buys + pick.holds + pick.sells > 0
      ? (pick.buys - pick.sells) / (pick.buys + pick.holds + pick.sells)
      : 0;

  const riskVariant =
    pick.risk === "low" ? "success" : pick.risk === "high" ? "danger" : "warning";

  if (locked) {
    return (
      <div className="relative">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm blur-[4px] pointer-events-none opacity-40">
          <span className="w-16 font-semibold truncate">***</span>
          <span className="flex-1 truncate">***</span>
          <span className="w-20 text-right">***</span>
          <span className="w-16 text-right">***</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Link href="/pricing" className="rounded-lg bg-emerald-400/90 px-3 py-1 text-xs font-semibold text-gray-900 hover:bg-emerald-300 transition-colors">
            Unlock
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/dashboard/stock/${pick.symbol}`} onClick={() => hapticImpact("light")}>
      <div className="flex items-center gap-2 sm:gap-3 rounded-xl border border-border bg-surface hover:bg-surface-elevated transition-colors px-2 sm:px-3 py-2 text-xs sm:text-sm">
        <span className="w-14 sm:w-20 font-semibold text-text-primary truncate">{pick.symbol}</span>
        <span className="flex-1 min-w-0 text-text-secondary truncate">{pick.name}</span>
        <span className="hidden md:block w-24 text-right text-text-secondary">{formatPrice(pick.price, pick.currency)}</span>
        <span className="hidden md:block w-24 text-right text-text-secondary">{formatPrice(pick.target, pick.currency)}</span>
        <span className="w-14 sm:w-16 text-right font-semibold text-accent-fg">+{pick.upside}%</span>
        <span className="hidden lg:block w-12 text-right text-text-secondary">{pick.analysts}</span>
        <span className="hidden lg:block w-16 text-right text-text-secondary">{(conviction * 100).toFixed(0)}%</span>
        <span className="hidden xl:block w-24 text-text-tertiary truncate">{pick.sector}</span>
        <span className="hidden sm:block w-14"><Badge variant={riskVariant} className="text-[10px] px-1.5 py-0.5">{pick.risk}</Badge></span>
        {pick.isin && <span className="hidden xl:block w-28 text-[10px] text-text-tertiary">{pick.isin}</span>}
        {pick.wkn && <span className="hidden xl:block w-16 text-[10px] text-text-tertiary">{pick.wkn}</span>}
      </div>
    </Link>
  );
}
