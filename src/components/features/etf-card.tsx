"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { EtfPick } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EtfCardProps {
  etf: EtfPick;
  compact?: boolean;
}

export function EtfCard({ etf, compact = false }: EtfCardProps) {
  const t = useTranslations("etf");

  return (
    <Link href={`/dashboard/etf/${etf.symbol}`}>
      <Card variant="glass" hover className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-text-secondary">{etf.theme}</div>
            <h3 className="text-lg font-semibold text-text-primary">
              {etf.symbol} &middot; {etf.name}
            </h3>
          </div>
          <Badge variant="info">ETF</Badge>
        </div>
        <div className={`grid gap-2 text-sm text-text-secondary ${compact ? "grid-cols-2" : "grid-cols-4"}`}>
          <div>
            <div className="text-[11px] uppercase text-text-secondary">
              {t("cagr5y")}
            </div>
            <div className="text-base font-semibold text-emerald-300">
              {etf.cagr5y != null ? `${etf.cagr5y}%` : "N/A"}
            </div>
          </div>
          {!compact && (
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {t("maxDrawdown")}
              </div>
              <div className="text-base font-semibold text-rose-200">
                {etf.drawdown}%
              </div>
            </div>
          )}
          <div>
            <div className="text-[11px] uppercase text-text-secondary">
              {t("expenseRatio")}
            </div>
            <div className="text-base font-semibold text-text-primary">
              {etf.fee != null ? `${etf.fee}%` : "N/A"}
            </div>
          </div>
          {!compact && (
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {t("sharpe")}
              </div>
              <div className="text-base font-semibold text-text-primary">
                {etf.sharpe.toFixed(2)}
              </div>
            </div>
          )}
        </div>
        {!compact && etf.brokerAvailability && etf.brokerAvailability.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {etf.brokerAvailability.map((b) => (
              <span
                key={b}
                className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-text-tertiary"
              >
                {b === "ibkr" ? "IBKR" : b === "t212" ? "T212" : b === "robinhood" ? "RH" : "eToro"}
              </span>
            ))}
          </div>
        )}
      </Card>
    </Link>
  );
}
