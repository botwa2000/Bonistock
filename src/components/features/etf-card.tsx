"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { EtfPick } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getExchangeName } from "@/lib/exchange-names";

interface EtfCardProps {
  etf: EtfPick;
  compact?: boolean;
  locked?: boolean;
}

export function EtfCard({ etf, compact = false, locked = false }: EtfCardProps) {
  const t = useTranslations("etf");

  if (locked) {
    return (
      <div className="relative">
        <Card variant="glass" className="flex flex-col gap-3 select-none border-l-2 border-l-blue-400/40">
          <div className="blur-[6px] pointer-events-none opacity-40">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-text-secondary">{etf.theme}</div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {etf.symbol} &middot; {etf.name}
                </h3>
              </div>
              <Badge variant="info">ETF</Badge>
            </div>
            <div className={`mt-3 grid gap-2 text-sm text-text-secondary ${compact ? "grid-cols-2" : "grid-cols-4"}`}>
              <div>
                <div className="text-[11px] uppercase text-text-secondary">{t("cagr5y")}</div>
                <div className="text-base font-semibold text-accent-fg">+••%</div>
              </div>
              {!compact && (
                <div>
                  <div className="text-[11px] uppercase text-text-secondary">{t("maxDrawdown")}</div>
                  <div className="text-base font-semibold text-danger-fg">-••%</div>
                </div>
              )}
              <div>
                <div className="text-[11px] uppercase text-text-secondary">{t("expenseRatio")}</div>
                <div className="text-base font-semibold text-text-primary">••%</div>
              </div>
              {!compact && (
                <div>
                  <div className="text-[11px] uppercase text-text-secondary">{t("sharpe")}</div>
                  <div className="text-base font-semibold text-text-primary">••</div>
                </div>
              )}
            </div>
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
    <Link href={`/dashboard/etf/${etf.symbol}`}>
      <Card variant="glass" hover className="flex flex-col gap-3 border-l-2 border-l-blue-400/40 overflow-hidden">
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
            <div className="text-base font-semibold text-accent-fg">
              {etf.cagr5y != null ? `${etf.cagr5y}%` : "N/A"}
            </div>
          </div>
          {!compact && (
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {t("maxDrawdown")}
              </div>
              <div className="text-base font-semibold text-danger-fg">
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

export function EtfRow({ etf, locked = false }: { etf: EtfPick; locked?: boolean }) {
  const t = useTranslations("etf");

  if (locked) {
    return (
      <div className="relative">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm blur-[4px] pointer-events-none opacity-40">
          <span className="w-16 font-semibold truncate">***</span>
          <span className="flex-1 truncate">***</span>
          <span className="w-20 text-right">***</span>
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
    <Link href={`/dashboard/etf/${etf.symbol}`}>
      <div className="flex items-center gap-2 sm:gap-3 rounded-xl border border-l-2 border-border border-l-blue-400/40 bg-surface hover:bg-surface-elevated transition-colors px-2 sm:px-3 py-2 text-xs sm:text-sm">
        <span className="w-14 sm:w-20 font-semibold text-text-primary truncate">{etf.symbol}</span>
        <span className="flex-1 min-w-0 text-text-secondary truncate">{etf.name}</span>
        <span className="w-16 text-right font-semibold text-accent-fg">{etf.cagr5y != null ? `${etf.cagr5y}%` : "N/A"}</span>
        <span className="hidden md:block w-16 text-right text-danger-fg">{etf.drawdown}%</span>
        <span className="hidden md:block w-16 text-right text-text-secondary">{etf.fee != null ? `${etf.fee}%` : "N/A"}</span>
        <span className="hidden lg:block w-16 text-right text-text-secondary">{etf.sharpe.toFixed(2)}</span>
        <span className="hidden lg:block w-24 text-text-tertiary truncate">{etf.theme}</span>
        <Badge variant="info" className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5">ETF</Badge>
        {etf.isin && <span className="hidden xl:block w-28 text-[10px] text-text-tertiary">{etf.isin}</span>}
        {etf.wkn && <span className="hidden xl:block w-16 text-[10px] text-text-tertiary">{etf.wkn}</span>}
      </div>
    </Link>
  );
}
