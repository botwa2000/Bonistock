"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function SubscriptionSection() {
  const t = useTranslations("profile");
  const { user } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);

  if (!user) return null;

  const tier = user.tier;
  const tierVariant =
    tier === "plus" ? "info" : tier === "pass" ? "accent" : "default";

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, "_blank");
      }
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <Card variant="glass" padding="lg">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{t("subscription")}</h2>
        <Badge variant={tierVariant}>{tier.toUpperCase()}</Badge>
      </div>

      <p className="mt-2 text-sm text-white/60">
        {tier === "plus"
          ? t("plusTierMessage")
          : tier === "pass"
            ? t("passTierMessage", { remaining: user.passActivationsRemaining })
            : t("freeTierMessage")}
      </p>

      {tier === "pass" && user.passExpiry && (
        <p className="mt-1 text-xs text-white/40">
          {t("passExpiry", { date: new Date(user.passExpiry).toLocaleDateString() })}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        {tier === "free" && (
          <Link href="/pricing">
            <Button size="sm">{t("changeTier")}</Button>
          </Link>
        )}
        {tier === "plus" && (
          <Button size="sm" variant="secondary" onClick={handleManageSubscription} disabled={portalLoading}>
            {portalLoading ? "..." : t("manageSubscription")}
          </Button>
        )}
        {tier === "pass" && (
          <Link href="/pricing">
            <Button size="sm" variant="secondary">{t("changeTier")}</Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
