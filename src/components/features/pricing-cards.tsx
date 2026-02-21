"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

interface Product {
  id: string;
  name: string;
  description: string;
  features: string[];
  type: "SUBSCRIPTION" | "PASS";
  priceAmount: number;
  currency: string;
  billingInterval: "MONTH" | "YEAR" | null;
  passType: string | null;
  passDays: number | null;
  trialDays: number | null;
  stripePriceId: string;
  highlighted: boolean;
  sortOrder: number;
}

function formatPrice(cents: number, interval?: "MONTH" | "YEAR" | null): string {
  const dollars = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  if (interval === "MONTH") return `$${dollars}/mo`;
  if (interval === "YEAR") return `$${dollars}/yr`;
  return `$${dollars}`;
}

export function PricingCards() {
  const t = useTranslations("pricing");
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [annual, setAnnual] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    fetch("/api/stripe/prices")
      .then((res) => res.json())
      .then((data: Product[]) => setProducts(data))
      .catch(() => {});
  }, []);

  const subscriptions = products.filter((p) => p.type === "SUBSCRIPTION");
  const monthlyProduct = subscriptions.find((p) => p.billingInterval === "MONTH");
  const annualProduct = subscriptions.find((p) => p.billingInterval === "YEAR");
  const activeProduct = annual ? annualProduct : monthlyProduct;

  const handleSubscribe = async (tier: "free" | "plus") => {
    if (!isLoggedIn) {
      router.push("/login?redirect=/pricing");
      return;
    }

    if (tier === "free") {
      router.push("/dashboard");
      return;
    }

    if (!activeProduct) return;

    setCheckingOut(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: activeProduct.stripePriceId,
          ...(activeProduct.trialDays ? { trialDays: activeProduct.trialDays } : {}),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setCheckingOut(false);
    }
  };

  // Free tier card (always present, not from DB)
  const freeTier = {
    name: "Free",
    tier: "free" as const,
    description: "Get started with the essentials",
    features: [
      "Top 5 upside stocks (weekly rotation)",
      "1 auto-mix per month",
      "Basic ETF explorer",
      "Broker comparison",
      "Onboarding goal picker",
    ],
    highlighted: false,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-3 text-sm text-text-secondary">
        <button
          className={`transition-colors ${!annual ? "text-text-primary font-semibold" : ""}`}
          onClick={() => setAnnual(false)}
        >
          {t("monthly")}
        </button>
        <button
          onClick={() => setAnnual(!annual)}
          className={`relative h-6 w-11 rounded-full transition-colors ${annual ? "bg-emerald-400" : "bg-surface"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${annual ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
        <button
          className={`transition-colors ${annual ? "text-text-primary font-semibold" : ""}`}
          onClick={() => setAnnual(true)}
        >
          {t("annual")}
          <Badge variant="accent" className="ml-2">
            {t("annualSave")}
          </Badge>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 max-w-3xl mx-auto">
        {/* Free tier card */}
        <Card variant="glass" className="relative flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{freeTier.name}</h3>
            <p className="text-sm text-text-secondary">{freeTier.description}</p>
          </div>
          <div className="text-3xl font-semibold text-text-primary">$0</div>
          <ul className="flex-1 space-y-2 text-sm text-text-secondary">
            {freeTier.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-300" />
                {f}
              </li>
            ))}
          </ul>
          <Button variant="secondary" fullWidth onClick={() => handleSubscribe("free")}>
            Get Started
          </Button>
        </Card>

        {/* Plus tier card (from DB) */}
        {activeProduct && (
          <Card
            variant={activeProduct.highlighted ? "accent" : "glass"}
            className={`relative flex flex-col gap-4 ${activeProduct.highlighted ? "ring-2 ring-emerald-300/50" : ""}`}
          >
            {activeProduct.highlighted && (
              <Badge
                variant="accent"
                className="absolute -top-3 left-1/2 -translate-x-1/2"
              >
                {t("popular")}
              </Badge>
            )}
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{activeProduct.name}</h3>
              <p className="text-sm text-text-secondary">{activeProduct.description}</p>
            </div>
            <div className="text-3xl font-semibold text-text-primary">
              {formatPrice(activeProduct.priceAmount, activeProduct.billingInterval)}
            </div>
            {activeProduct.trialDays && (
              <Badge variant="info" className="w-fit">
                {activeProduct.trialDays}-day free trial
              </Badge>
            )}
            <ul className="flex-1 space-y-2 text-sm text-text-secondary">
              {(activeProduct.features as string[]).map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-300" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant="primary"
              fullWidth
              disabled={checkingOut}
              onClick={() => handleSubscribe("plus")}
            >
              {checkingOut ? "..." : "Start Plus"}
            </Button>
          </Card>
        )}
      </div>

      <p className="text-center text-xs text-text-tertiary">{t("guarantee")}</p>
    </div>
  );
}
