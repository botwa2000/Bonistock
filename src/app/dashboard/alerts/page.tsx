"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { mockAlerts } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { UpgradePaywall } from "@/components/features/upgrade-paywall";

export default function AlertsPage() {
  const t = useTranslations("alerts");
  const { user } = useAuth();
  const tier = user?.tier ?? "free";

  if (tier === "free" || tier === "pass") {
    return (
      <div className="space-y-6">
        <SectionHeader title={t("title")} subtitle={t("subtitle")} />
        <p className="text-center text-sm text-white/60">
          {t("plusRequired")}
        </p>
        <UpgradePaywall feature="Alerts require Plus" />
      </div>
    );
  }

  const triggered = mockAlerts.filter((a) => a.triggered);
  const watching = mockAlerts.filter((a) => !a.triggered);

  const typeVariant = (type: string) => {
    switch (type) {
      case "price_target":
        return "accent";
      case "rating_change":
        return "info";
      case "trend_warning":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={<Button size="sm">{t("createAlert")}</Button>}
      />

      {triggered.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/60">
            {t("triggered")}
          </h3>
          {triggered.map((alert) => (
            <Card key={alert.id} variant="glass" className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href={`/dashboard/stock/${alert.symbol}`}
                  className="font-semibold text-white hover:text-emerald-300"
                >
                  {alert.symbol}
                </Link>
                <Badge variant={typeVariant(alert.type) as "accent" | "info" | "warning" | "default"}>
                  {alert.type.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-white/70">{alert.message}</span>
                <span className="text-xs text-white/40">{alert.createdAt}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {watching.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/60">
            {t("watching")}
          </h3>
          {watching.map((alert) => (
            <Card key={alert.id} variant="default" className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href={`/dashboard/stock/${alert.symbol}`}
                  className="font-semibold text-white hover:text-emerald-300"
                >
                  {alert.symbol}
                </Link>
                <Badge variant={typeVariant(alert.type) as "accent" | "info" | "warning" | "default"}>
                  {alert.type.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-white/70">{alert.message}</span>
                <span className="text-xs text-white/40">{alert.createdAt}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
