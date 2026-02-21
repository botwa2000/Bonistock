"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { mockWatchlist } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { UpgradePaywall } from "@/components/features/upgrade-paywall";

export default function WatchlistPage() {
  const t = useTranslations("watchlist");
  const { user } = useAuth();
  const tier = user?.tier ?? "free";

  if (tier === "free" || tier === "pass") {
    return (
      <div className="space-y-6">
        <SectionHeader title={t("title")} subtitle={t("subtitle")} />
        <p className="text-center text-sm text-text-secondary">
          {t("plusRequired")}
        </p>
        <UpgradePaywall feature="Watchlists require Plus" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={<Badge variant="accent">{mockWatchlist.length} items</Badge>}
      />

      <Card variant="glass" padding="none">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs uppercase text-text-secondary">
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">{t("change")}</th>
              <th className="px-4 py-3 text-right">Upside</th>
              <th className="px-4 py-3 text-right">{t("addedOn")}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {mockWatchlist.map((item) => (
              <tr
                key={item.symbol}
                className="border-b border-border-subtle hover:bg-surface"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/stock/${item.symbol}`}
                    className="font-semibold text-text-primary hover:text-emerald-300"
                  >
                    {item.symbol}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">{item.name}</td>
                <td className="px-4 py-3 text-right text-white">
                  ${item.price.toFixed(2)}
                </td>
                <td
                  className={`px-4 py-3 text-right ${item.changePercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                >
                  {item.changePercent >= 0 ? "+" : ""}
                  {item.changePercent.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right text-emerald-300">
                  +{item.upside}%
                </td>
                <td className="px-4 py-3 text-right text-text-tertiary">
                  {item.addedAt}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm">
                    {t("remove")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
