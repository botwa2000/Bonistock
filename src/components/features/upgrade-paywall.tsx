"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PassProduct {
  id: string;
  stripePriceId: string;
  passType: string;
  name: string;
}

interface UpgradePaywallProps {
  feature: string;
}

export function UpgradePaywall({ feature }: UpgradePaywallProps) {
  const t = useTranslations("paywall");
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [passProducts, setPassProducts] = useState<PassProduct[]>([]);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stripe/prices")
      .then((res) => res.json())
      .then((data: Array<{ id: string; type: string; stripePriceId: string; passType: string | null; name: string }>) => {
        setPassProducts(
          data
            .filter((p) => p.type === "PASS" && p.passType)
            .map((p) => ({ id: p.id, stripePriceId: p.stripePriceId, passType: p.passType!, name: p.name }))
        );
      })
      .catch(() => {});
  }, []);

  const handleBuyPass = async (passType: string) => {
    if (!isLoggedIn) {
      router.push("/login?redirect=/pricing");
      return;
    }

    const product = passProducts.find((p) => p.passType === passType);
    if (!product) return;

    setBuying(passType);
    try {
      const res = await fetch("/api/stripe/pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: product.stripePriceId,
          passType: product.passType,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setBuying(null);
    }
  };

  return (
    <Card variant="glass" padding="lg" className="mx-auto max-w-lg text-center">
      <div className="text-3xl">{"\uD83D\uDD13"}</div>
      <h3 className="mt-3 text-lg font-semibold text-text-primary">{t("title")}</h3>
      <p className="mt-1 text-sm text-text-secondary">
        {feature} &mdash; {t("subtitle")}
      </p>

      <div className="mt-6 space-y-3">
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="text-sm font-semibold text-text-primary">
                {t("oneDayOption")}
              </div>
              <div className="text-xs text-text-secondary">
                {t("oneDayDescription")}
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={buying === "ONE_DAY"}
              onClick={() => handleBuyPass("ONE_DAY")}
            >
              {buying === "ONE_DAY" ? "..." : "Buy"}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="text-sm font-semibold text-text-primary">
                {t("threeDayOption")}
              </div>
              <div className="text-xs text-text-secondary">
                {t("threeDayDescription")}
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={buying === "THREE_DAY"}
              onClick={() => handleBuyPass("THREE_DAY")}
            >
              {buying === "THREE_DAY" ? "..." : "Buy"}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="text-sm font-semibold text-text-primary">
                {t("twelveDayOption")}
              </div>
              <div className="text-xs text-text-secondary">
                {t("twelveDayDescription")}
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={buying === "TWELVE_DAY"}
              onClick={() => handleBuyPass("TWELVE_DAY")}
            >
              {buying === "TWELVE_DAY" ? "..." : "Buy"}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          <div className="h-px flex-1 bg-surface" />
          {t("or")}
          <div className="h-px flex-1 bg-surface" />
        </div>

        <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-4">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">
                  {t("plusOption")}
                </span>
                <Badge variant="accent">Best Value</Badge>
              </div>
              <div className="text-xs text-text-secondary">
                {t("plusDescription")}
              </div>
            </div>
            <Link href="/pricing">
              <Button size="sm">Upgrade</Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
