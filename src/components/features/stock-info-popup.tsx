"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { StockPick } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface StockInfoPopupProps {
  pick: StockPick;
  onClose: () => void;
}

export function StockInfoPopup({ pick, onClose }: StockInfoPopupProps) {
  const t = useTranslations("stock");

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const conviction =
    pick.buys + pick.holds + pick.sells > 0
      ? ((pick.buys - pick.sells) / (pick.buys + pick.holds + pick.sells)) * 100
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <Card variant="glass" padding="lg" className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                {pick.symbol} &middot; {pick.name}
              </h2>
              <div className="mt-1 flex items-center gap-2">
                <Badge className="text-xs">{pick.exchange}</Badge>
                <Badge className="text-xs">{pick.currency}</Badge>
                <Badge className="text-xs">{pick.sector}</Badge>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {pick.description && (
            <div>
              <h3 className="text-xs uppercase text-text-secondary">{t("description")}</h3>
              <p className="mt-1 text-sm text-text-secondary leading-relaxed">{pick.description}</p>
            </div>
          )}

          {pick.whyThisPick && (
            <div>
              <h3 className="text-xs uppercase text-text-secondary">{t("whyThisPick")}</h3>
              <p className="mt-1 text-sm text-text-secondary leading-relaxed">{pick.whyThisPick}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <div className="text-xs uppercase text-text-secondary">{t("dividendYield")}</div>
              <div className="text-sm font-semibold text-text-primary">
                {pick.dividendYield > 0 ? `${pick.dividendYield.toFixed(2)}%` : "N/A"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-text-secondary">{t("marketCap")}</div>
              <div className="text-sm font-semibold text-text-primary capitalize">{pick.marketCap}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-text-secondary">{t("horizon")}</div>
              <div className="text-sm font-semibold text-text-primary">{pick.horizon}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-text-secondary">{t("conviction")}</div>
              <div className="text-sm font-semibold text-emerald-300">{conviction.toFixed(0)}%</div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Link href={`/dashboard/stock/${pick.symbol}`} className="flex-1">
              <Button fullWidth>{t("viewDetails")}</Button>
            </Link>
            <Button variant="secondary" onClick={onClose}>
              {"\u2715"} Close
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
