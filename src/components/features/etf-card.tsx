"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { EtfPick } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EtfCardProps {
  etf: EtfPick;
}

export function EtfCard({ etf }: EtfCardProps) {
  const t = useTranslations("etf");

  return (
    <Link href={`/dashboard/etf/${etf.symbol}`}>
      <Card variant="glass" hover className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-white/60">{etf.theme}</div>
            <h3 className="text-lg font-semibold text-white">
              {etf.symbol} &middot; {etf.name}
            </h3>
          </div>
          <Badge variant="info">ETF</Badge>
        </div>
        <div className="grid grid-cols-4 gap-2 text-sm text-white/80">
          <div>
            <div className="text-[11px] uppercase text-white/60">
              {t("cagr5y")}
            </div>
            <div className="text-base font-semibold text-emerald-300">
              {etf.cagr5y}%
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase text-white/60">
              {t("maxDrawdown")}
            </div>
            <div className="text-base font-semibold text-rose-200">
              {etf.drawdown}%
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase text-white/60">
              {t("expenseRatio")}
            </div>
            <div className="text-base font-semibold text-white">
              {etf.fee}%
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase text-white/60">
              {t("sharpe")}
            </div>
            <div className="text-base font-semibold text-white">
              {etf.sharpe.toFixed(2)}
            </div>
          </div>
        </div>
        {etf.brokerAvailability && etf.brokerAvailability.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {etf.brokerAvailability.map((b) => (
              <span
                key={b}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50"
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
