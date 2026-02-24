"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
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
      />

      <Card variant="accent" className="text-center py-12 space-y-3">
        <div className="text-4xl">&#128679;</div>
        <h3 className="text-lg font-semibold text-text-primary">Coming Soon</h3>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          Watchlists are under development. You&apos;ll soon be able to track your favorite stocks and get notified about price changes.
        </p>
      </Card>
    </div>
  );
}
