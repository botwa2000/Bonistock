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
  status?: string;
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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleManagePayment = async () => {
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

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/user/subscription/cancel", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSubInfo((prev) =>
          prev
            ? {
                ...prev,
                cancelAtPeriodEnd: true,
                currentPeriodEnd: data.currentPeriodEnd ?? prev.currentPeriodEnd,
              }
            : prev
        );
        setShowCancelConfirm(false);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/user/subscription/resume", { method: "POST" });
      if (res.ok) {
        setSubInfo((prev) =>
          prev ? { ...prev, cancelAtPeriodEnd: false } : prev
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  const intervalLabel =
    subInfo?.billingInterval === "MONTH"
      ? "/mo"
      : subInfo?.billingInterval === "YEAR"
        ? "/yr"
        : "";

  const periodEndDate = subInfo?.currentPeriodEnd
    ? new Date(subInfo.currentPeriodEnd).toLocaleDateString()
    : null;

  const statusBadge = () => {
    if (!subInfo) return null;
    if (subInfo.cancelAtPeriodEnd) {
      return <Badge variant="warning">{t("statusCanceling")}</Badge>;
    }
    if (subInfo.status === "TRIALING") {
      return <Badge variant="accent">{t("statusTrialing")}</Badge>;
    }
    return <Badge variant="success">{t("statusActive")}</Badge>;
  };

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
        <div className="mt-3 space-y-2">
          {/* Plan name + price + status badge */}
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-text-primary">
              {subInfo.planName}{" "}
              {subInfo.planPrice ? `\u2014 ${subInfo.planPrice}${intervalLabel}` : ""}
            </p>
            {statusBadge()}
          </div>

          {/* Billing / trial info */}
          {subInfo.cancelAtPeriodEnd && periodEndDate ? (
            <p className="text-sm text-amber-400">
              {t("subscriptionCanceling", { date: periodEndDate })}
            </p>
          ) : subInfo.status === "TRIALING" && periodEndDate ? (
            <p className="text-xs text-text-tertiary">
              {t("trialEnds", { date: periodEndDate })}
            </p>
          ) : periodEndDate ? (
            <p className="text-xs text-text-tertiary">
              {t("nextBilling", { date: periodEndDate })}
            </p>
          ) : null}

          {/* Cancel confirmation (inline) */}
          {showCancelConfirm && (
            <div className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 space-y-2">
              <p className="text-sm font-medium text-warning-fg">
                {t("cancelConfirmTitle")}
              </p>
              <p className="text-xs text-text-secondary">
                {t("cancelConfirmMessage", { date: periodEndDate ?? "" })}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleCancel}
                  disabled={actionLoading}
                >
                  {actionLoading ? "..." : t("cancelConfirmButton")}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={actionLoading}
                >
                  {t("cancelKeepButton")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {tier === "pass" && user.passExpiry && (
        <p className="mt-1 text-xs text-text-tertiary">
          {t("passExpiry", { date: new Date(user.passExpiry).toLocaleDateString() })}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {tier === "free" && (
          <Link href="/pricing">
            <Button size="sm">{t("changeTier")}</Button>
          </Link>
        )}
        {tier === "plus" && subInfo && (
          <>
            {subInfo.cancelAtPeriodEnd ? (
              <Button
                size="sm"
                variant="primary"
                onClick={handleResume}
                disabled={actionLoading}
              >
                {actionLoading ? "..." : t("resumeSubscription")}
              </Button>
            ) : (
              !showCancelConfirm && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  {t("cancelSubscription")}
                </Button>
              )
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleManagePayment}
              disabled={portalLoading}
            >
              {portalLoading ? "..." : t("managePayment")}
            </Button>
          </>
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
