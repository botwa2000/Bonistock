"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isIOS } from "@/lib/native";
import { getOfferings, purchasePackage, type RCPackage } from "@/lib/revenuecat";

interface Product {
  id: string;
  name: string;
  description: string;
  features: string[] | null;
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
  appleProductId?: string | null;
  iosPriceAmount?: number | null;
}

function formatPrice(cents: number, interval?: "MONTH" | "YEAR" | null): string {
  const dollars = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  if (interval === "MONTH") return `$${dollars}/mo`;
  if (interval === "YEAR") return `$${dollars}/yr`;
  return `$${dollars}`;
}

interface UpgradePaywallProps {
  feature: string;
}

export function UpgradePaywall({ feature }: UpgradePaywallProps) {
  const t = useTranslations("paywall");
  const router = useRouter();
  const { isLoggedIn, refreshUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [annual, setAnnual] = useState(true);
  const [rcPackages, setRcPackages] = useState<RCPackage[]>([]);

  useEffect(() => {
    fetch("/api/stripe/prices")
      .then((res) => res.json())
      .then((data: Product[]) => setProducts(data))
      .catch(() => {});

    if (isIOS) {
      getOfferings().then(setRcPackages).catch(() => {});
    }
  }, []);

  const findRcPackage = (product: Product): RCPackage | undefined =>
    product.appleProductId
      ? rcPackages.find((pkg) => pkg.productId === product.appleProductId)
      : undefined;

  const passProducts = products
    .filter((p) => p.type === "PASS" && p.passType)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const subscriptions = products.filter((p) => p.type === "SUBSCRIPTION");
  const monthlyProduct = subscriptions.find((p) => p.billingInterval === "MONTH");
  const annualProduct = subscriptions.find((p) => p.billingInterval === "YEAR");
  const activeSubscription = annual ? annualProduct : monthlyProduct;

  const passNameMap: Record<string, string> = {
    ONE_DAY: t("oneDayOption"),
    THREE_DAY: t("threeDayOption"),
    TWELVE_DAY: t("twelveDayOption"),
  };

  const passDescMap: Record<string, string> = {
    ONE_DAY: t("oneDayDescription"),
    THREE_DAY: t("threeDayDescription"),
    TWELVE_DAY: t("twelveDayDescription"),
  };

  const handleBuyPass = async (passType: string) => {
    if (!isLoggedIn) {
      router.push("/login?redirect=/pricing");
      return;
    }

    const product = passProducts.find((p) => p.passType === passType);
    if (!product) {
      setError("Products are not configured yet. Please contact support.");
      return;
    }

    setError(null);
    setBuying(passType);

    // iOS: use RevenueCat / Apple IAP
    if (isIOS) {
      const pkg = findRcPackage(product);
      if (pkg) {
        try {
          const success = await purchasePackage(pkg.identifier);
          if (success) {
            await refreshUser();
          } else {
            setError("Purchase was canceled or failed. Please try again.");
          }
        } catch {
          setError("Purchase failed. Please try again.");
        } finally {
          setBuying(null);
        }
        return;
      }
    }

    // Web: use Stripe checkout
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
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBuying(null);
    }
  };

  const handleSubscribe = async () => {
    if (!isLoggedIn) {
      router.push("/login?redirect=/pricing");
      return;
    }

    if (!activeSubscription) {
      setError("Subscription products are not configured yet. Please contact support.");
      return;
    }

    setError(null);
    setBuying("subscription");

    // iOS: use RevenueCat / Apple IAP
    if (isIOS) {
      const pkg = findRcPackage(activeSubscription);
      if (pkg) {
        try {
          const success = await purchasePackage(pkg.identifier);
          if (success) {
            await refreshUser();
          } else {
            setError("Purchase was canceled or failed. Please try again.");
          }
        } catch {
          setError("Purchase failed. Please try again.");
        } finally {
          setBuying(null);
        }
        return;
      }
    }

    // Web: use Stripe checkout
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: activeSubscription.stripePriceId,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
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

      {error && (
        <p className="mt-3 text-sm text-danger-fg">{error}</p>
      )}

      <div className="mt-6 space-y-3">
        {/* Pass products */}
        {passProducts.map((product) => {
          const rcPkg = findRcPackage(product);
          const priceDisplay = isIOS && rcPkg ? rcPkg.priceString : formatPrice(product.priceAmount);
          return (
          <div key={product.id} className="rounded-xl border border-border bg-surface-elevated p-4">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="text-sm font-semibold text-text-primary">
                  {passNameMap[product.passType!] ?? product.name}
                  <span className="ml-2 text-emerald-400">{priceDisplay}</span>
                </div>
                <div className="text-xs text-text-secondary">
                  {passDescMap[product.passType!] ?? product.description}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={buying === product.passType}
                onClick={() => handleBuyPass(product.passType!)}
              >
                {buying === product.passType ? "..." : "Buy"}
              </Button>
            </div>
          </div>
          );
        })}

        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          <div className="h-px flex-1 bg-surface" />
          {t("or")}
          <div className="h-px flex-1 bg-surface" />
        </div>

        {/* Subscription section */}
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
          </div>

          {/* Monthly / Annual toggle */}
          {(monthlyProduct || annualProduct) && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  !annual
                    ? "bg-emerald-400/20 text-emerald-400"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                Monthly
                {monthlyProduct && (
                  <span className="ml-1">
                    {isIOS && findRcPackage(monthlyProduct)
                      ? `${findRcPackage(monthlyProduct)!.priceString}/mo`
                      : formatPrice(monthlyProduct.priceAmount, "MONTH")}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  annual
                    ? "bg-emerald-400/20 text-emerald-400"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                Annual
                {annualProduct && (
                  <span className="ml-1">
                    {isIOS && findRcPackage(annualProduct)
                      ? `${findRcPackage(annualProduct)!.priceString}/yr`
                      : formatPrice(annualProduct.priceAmount, "YEAR")}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Savings badge */}
          {annual && monthlyProduct && annualProduct && (
            <div className="mt-2 text-center">
              <Badge variant="accent">
                Save {Math.round((1 - annualProduct.priceAmount / (monthlyProduct.priceAmount * 12)) * 100)}%
              </Badge>
            </div>
          )}

          {/* Guarantee */}
          <p className="mt-2 text-center text-xs text-text-tertiary">
            {t("guarantee")}
          </p>

          <div className="mt-3 text-center">
            <Button
              size="sm"
              disabled={buying === "subscription"}
              onClick={handleSubscribe}
            >
              {buying === "subscription" ? "..." : "Subscribe"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
