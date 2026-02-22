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
  type: "SUBSCRIPTION" | "PASS";
  priceAmount: number;
  currency: string;
  passType: string | null;
  passDays: number | null;
  stripePriceId: string;
  highlighted: boolean;
}

function formatPrice(cents: number): string {
  const dollars = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return `$${dollars}`;
}

function perDayRate(cents: number, days: number): string {
  const perDay = (cents / 100 / days).toFixed(2);
  return `$${perDay}/day`;
}

export function DayPassSection() {
  const t = useTranslations("pricing");
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stripe/prices")
      .then((res) => res.json())
      .then((data: Product[]) => setProducts(data))
      .catch(() => {});
  }, []);

  const passProducts = products.filter((p) => p.type === "PASS");

  const handleBuyPass = async (product: Product) => {
    if (!isLoggedIn) {
      router.push("/login?redirect=/pricing");
      return;
    }

    setBuying(product.id);
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

  if (passProducts.length === 0) return null;

  // Determine savings badges: the product with the lowest per-day cost gets "Best per-day rate"
  // and mid-tier products get a percentage savings vs the highest per-day cost
  const withPerDay = passProducts.map((p) => ({
    product: p,
    perDay: p.passDays ? p.priceAmount / p.passDays : p.priceAmount,
  }));
  const maxPerDay = Math.max(...withPerDay.map((w) => w.perDay));
  const minPerDay = Math.min(...withPerDay.map((w) => w.perDay));

  return (
    <Card variant="glass" padding="lg">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-text-primary">
          {t("dayPassTitle")}
        </h3>
        <p className="mt-1 text-sm text-text-secondary">{t("dayPassSubtitle")}</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {passProducts.map((product) => {
          const thisPerDay = product.passDays
            ? product.priceAmount / product.passDays
            : product.priceAmount;
          let savingsBadge: string | null = null;
          if (thisPerDay === minPerDay && passProducts.length > 1) {
            savingsBadge = "Best per-day rate";
          } else if (thisPerDay < maxPerDay) {
            const pct = Math.round((1 - thisPerDay / maxPerDay) * 100);
            if (pct > 0) savingsBadge = `Save ${pct}%`;
          }

          return (
            <div
              key={product.id}
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface-elevated p-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-text-primary">
                  {formatPrice(product.priceAmount)}
                </span>
                {savingsBadge && (
                  <Badge variant="accent">{savingsBadge}</Badge>
                )}
              </div>
              <div className="text-sm font-medium text-text-primary">{product.name}</div>
              <p className="text-xs text-text-secondary">{product.description}</p>
              {product.passDays && (
                <p className="text-xs text-text-tertiary">
                  {perDayRate(product.priceAmount, product.passDays)}
                </p>
              )}
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                disabled={buying === product.id}
                onClick={() => handleBuyPass(product)}
              >
                {buying === product.id ? "..." : `Buy ${product.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-text-tertiary">
        {t("dayPassNote")}
      </p>
    </Card>
  );
}
