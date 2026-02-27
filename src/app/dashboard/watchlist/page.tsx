"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useWatchlist } from "@/lib/use-watchlist";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/currency";

export default function WatchlistPage() {
  const t = useTranslations("watchlist");
  const { user } = useAuth();
  const { items, loading, toggle } = useWatchlist();

  if (!user) {
    return (
      <div className="space-y-6">
        <SectionHeader title={t("title")} subtitle={t("subtitle")} />
        <Card variant="glass" className="py-12 text-center">
          <p className="text-text-secondary">Please log in to use your watchlist.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={<Badge variant="accent">{items.length} stocks</Badge>}
      />

      {items.length === 0 ? (
        <Card variant="glass" className="py-12 text-center space-y-3">
          <p className="text-text-secondary">{t("empty")}</p>
          <Link href="/dashboard">
            <Button variant="secondary">Browse Stocks</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.symbol}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
            >
              <Link
                href={`/dashboard/stock/${item.symbol}`}
                className="flex-1 min-w-0 flex items-center gap-3"
              >
                <span className="font-semibold text-text-primary w-16 shrink-0">{item.symbol}</span>
                <span className="text-text-secondary truncate flex-1">{item.name ?? item.symbol}</span>
                {item.price != null && (
                  <span className="text-sm text-text-secondary hidden sm:block">{formatPrice(item.price)}</span>
                )}
                {item.upside != null && (
                  <span className="text-sm font-semibold text-accent-fg">+{item.upside}%</span>
                )}
              </Link>
              <span className="text-xs text-text-tertiary hidden md:block">
                {t("addedOn")} {new Date(item.addedAt).toLocaleDateString()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggle(item.symbol)}
              >
                {t("remove")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
