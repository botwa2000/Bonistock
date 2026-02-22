"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SubscriptionInfo {
  tier: string;
  planName?: string;
  planPrice?: string;
  billingInterval?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

export function SubscriptionSection() {
  const t = useTranslations("profile");
  const { user } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    if (user?.tier === "plus") {
      fetch("/api/user/subscription")
        .then((res) => res.json())
        .then((data) => setSubInfo(data))
        .catch(() => {});
    }
  }, [user?.tier]);

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

  const intervalLabel = subInfo?.billingInterval === "MONTH" ? "/mo" : subInfo?.billingInterval === "YEAR" ? "/yr" : "";

  return (
    <Card variant="glass" padding="lg">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">{t("subscription")}</h2>
        <Badge variant={tierVariant}>{tier.toUpperCase()}</Badge>
      </div>

      <p className="mt-2 text-sm text-text-secondary">
        {tier === "plus"
          ? t("plusTierMessage")
          : tier === "pass"
            ? t("passTierMessage", { remaining: user.passActivationsRemaining })
            : t("freeTierMessage")}
      </p>

      {tier === "plus" && subInfo && subInfo.planName && (
        <div className="mt-2 space-y-1">
          <p className="text-sm font-medium text-text-primary">
            {subInfo.planName} {subInfo.planPrice ? `\u2014 ${subInfo.planPrice}${intervalLabel}` : ""}
          </p>
          {subInfo.cancelAtPeriodEnd && subInfo.currentPeriodEnd && (
            <p className="text-sm text-amber-400">
              Cancels at end of period ({new Date(subInfo.currentPeriodEnd).toLocaleDateString()})
            </p>
          )}
          {!subInfo.cancelAtPeriodEnd && subInfo.currentPeriodEnd && (
            <p className="text-xs text-text-tertiary">
              Next billing date: {new Date(subInfo.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {tier === "pass" && user.passExpiry && (
        <p className="mt-1 text-xs text-text-tertiary">
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
