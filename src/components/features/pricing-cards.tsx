"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { openInAppBrowser, isIOS } from "@/lib/native";
import { getProducts, purchaseProduct, type AppleProduct } from "@/lib/apple-iap";
import { trackEvent } from "@/components/features/analytics";

interface ProductPrice {
  currencyId: string;
  amount: number;
  iosAmount: number | null;
  stripePriceId: string | null;
  usualAmount: number | null;
}

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
  usualPrice?: number | null;
  appleProductId?: string | null;
  iosPriceAmount?: number | null;
  prices?: ProductPrice[];
}

interface RegionCurrencyInfo {
  region: string;
  currencyId: string;
  currency: { id: string; name: string; symbol: string };
}

function getRegionCookie(): string {
  if (typeof document === "undefined") return "GLOBAL";
  const match = document.cookie.match(/(?:^|;\s*)NEXT_REGION=([^;]*)/);
  return match?.[1] ?? "GLOBAL";
}

export function PricingCards() {
  const t = useTranslations("pricing");
  const router = useRouter();
  const { isLoggedIn, refreshUser } = useAuth();
  const [annual, setAnnual] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [appleProducts, setAppleProducts] = useState<AppleProduct[]>([]);
  const [regionCurrencies, setRegionCurrencies] = useState<RegionCurrencyInfo[]>([]);
  const [userRegion, setUserRegion] = useState("GLOBAL");

  useEffect(() => {
    setUserRegion(getRegionCookie());

    // Fetch products and region-currency mappings in parallel
    Promise.all([
      fetch("/api/stripe/prices").then((r) => r.json()),
      fetch("/api/region-currencies").then((r) => r.json()).catch(() => []),
    ]).then(([productsData, rcData]: [Product[], RegionCurrencyInfo[]]) => {
      setProducts(productsData);
      setRegionCurrencies(rcData);

      if (isIOS) {
        const appleIds = productsData
          .map((p) => p.appleProductId)
          .filter((id): id is string => !!id);
        if (appleIds.length > 0) {
          getProducts(appleIds).then(setAppleProducts).catch(() => {});
        }
      }
    }).catch(() => {});
  }, []);

  // Determine the user's display currency from region mapping
  const regionMapping = regionCurrencies.find((rc) => rc.region === userRegion);
  const displayCurrencyId = regionMapping?.currencyId ?? "USD";
  const displayCurrencySymbol = regionMapping?.currency?.symbol ?? "$";

  // True currency symbols are 1-2 chars (e.g., $, €, £, ¥, ₹)
  // Multi-char codes like CHF, RUB need a space before the amount
  function prefixSymbol(sym: string): string {
    return sym.length <= 2 ? sym : `${sym}\u00A0`;
  }

  // Format price in the display currency
  function formatPrice(cents: number, interval?: "MONTH" | "YEAR" | null, symbol?: string): string {
    const raw = symbol ?? displayCurrencySymbol;
    const s = prefixSymbol(raw);
    const dollars = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
    if (interval === "MONTH") return `${s}${dollars}/mo`;
    if (interval === "YEAR") return `${s}${dollars}/yr`;
    return `${s}${dollars}`;
  }

  function perDayRate(cents: number, days: number): string {
    const s = prefixSymbol(displayCurrencySymbol);
    const perDay = (cents / 100 / days).toFixed(2);
    return `${s}${perDay}/day`;
  }

  // Get the price amount for the display currency (from ProductPrice, fallback to base price)
  function getRegionalPrice(product: Product): number {
    if (displayCurrencyId === "USD" || displayCurrencyId === product.currency.toUpperCase()) {
      return product.priceAmount;
    }
    const pp = product.prices?.find((p) => p.currencyId === displayCurrencyId);
    return pp?.amount ?? product.priceAmount;
  }

  // Get the Stripe Price ID for the user's display currency (for checkout)
  function getRegionalStripePriceId(product: Product): string {
    if (displayCurrencyId !== "USD" && displayCurrencyId !== product.currency.toUpperCase()) {
      const pp = product.prices?.find((p) => p.currencyId === displayCurrencyId);
      if (pp?.stripePriceId) return pp.stripePriceId;
    }
    return product.stripePriceId;
  }

  // Get the per-currency "usual" price for discount display
  function getRegionalUsualPrice(product: Product): number | null {
    if (displayCurrencyId !== "USD" && displayCurrencyId !== product.currency.toUpperCase()) {
      const pp = product.prices?.find((p) => p.currencyId === displayCurrencyId);
      if (pp) return pp.usualAmount ?? null;
    }
    return product.usualPrice ?? null;
  }

  function getRegionalIosPrice(product: Product): number | null {
    if (displayCurrencyId === "USD" || displayCurrencyId === product.currency.toUpperCase()) {
      return product.iosPriceAmount ?? null;
    }
    const pp = product.prices?.find((p) => p.currencyId === displayCurrencyId);
    return pp?.iosAmount ?? product.iosPriceAmount ?? null;
  }

  // Helper: find Apple product matching a DB product's appleProductId
  const findAppleProduct = (product: Product): AppleProduct | undefined =>
    product.appleProductId
      ? appleProducts.find((ap) => ap.identifier === product.appleProductId)
      : undefined;

  // Helper: get display price — use Apple-localized price on iOS if available
  const getDisplayPrice = (product: Product): number => {
    if (isIOS) {
      const ap = findAppleProduct(product);
      if (ap) return Math.round(ap.price * 100);
      const iosPrice = getRegionalIosPrice(product);
      if (iosPrice) return iosPrice;
    }
    return getRegionalPrice(product);
  };

  // Helper: get formatted price string from Apple on iOS
  const getApplePriceString = (product: Product): string | null => {
    if (!isIOS) return null;
    const ap = findAppleProduct(product);
    return ap?.priceString ?? null;
  };

  const subscriptions = products.filter((p) => p.type === "SUBSCRIPTION");
  const passProducts = products.filter((p) => p.type === "PASS");
  const monthlyProduct = subscriptions.find((p) => p.billingInterval === "MONTH");
  const annualProduct = subscriptions.find((p) => p.billingInterval === "YEAR");
  const dbProduct = annual ? annualProduct : monthlyProduct;

  const fallbackPlus = {
    id: "fallback",
    name: "Plus",
    description: "Full access for active investors",
    features: [
      "Full upside list (60+ stocks, updated weekly)",
      "Unlimited auto-mix generation",
      "Stock detail pages with analyst breakdown",
      "Advanced filters (sector, broker, cap, dividend)",
      "Watchlists & price alerts",
      "Priority data refresh",
    ],
    type: "SUBSCRIPTION" as const,
    priceAmount: annual ? 4999 : 699,
    currency: "usd",
    billingInterval: annual ? ("YEAR" as const) : ("MONTH" as const),
    passType: null,
    passDays: null,
    trialDays: null,
    stripePriceId: "",
    highlighted: true,
    sortOrder: 0,
  };

  const activeProduct = dbProduct ?? fallbackPlus;

  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (tier: "free" | "plus") => {
    if (!isLoggedIn) {
      router.push("/login?redirect=/pricing");
      return;
    }

    if (tier === "free") {
      router.push("/dashboard");
      return;
    }

    setError(null);
    setCheckingOut(true);

    // iOS: use StoreKit 2 via @capgo/native-purchases
    if (isIOS && (activeProduct as Product).appleProductId) {
      try {
        const result = await purchaseProduct((activeProduct as Product).appleProductId!);
        if (result) {
          const verifyRes = await fetch("/api/apple/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId: result.transactionId }),
          });
          if (verifyRes.ok) {
            await refreshUser();
          } else {
            setError("Purchase verification failed. Please contact support.");
          }
        } else {
          setError("Purchase was canceled or failed. Please try again.");
        }
      } catch {
        setError("Purchase failed. Please try again.");
      } finally {
        setCheckingOut(false);
      }
      return;
    }

    // Web: use Stripe checkout
    const subPriceId = getRegionalStripePriceId(activeProduct as Product);
    if (!subPriceId) {
      setError("Products are not configured yet. Please contact support.");
      setCheckingOut(false);
      return;
    }

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: subPriceId,
        }),
      });
      const data = await res.json();
      if (data.url) {
        const price = getRegionalPrice(activeProduct as Product);
        trackEvent("begin_checkout", {
          currency: displayCurrencyId,
          value: price / 100,
          items: [{ item_id: "plus_subscription", item_name: (activeProduct as Product).name, price: price / 100, quantity: 1 }],
        });
        openInAppBrowser(data.url);
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  const handleBuyPass = async (product: Product) => {
    if (!isLoggedIn) {
      router.push("/login?redirect=/pricing");
      return;
    }

    setError(null);
    setBuying(product.id);

    // iOS: use StoreKit 2 via @capgo/native-purchases
    if (isIOS && product.appleProductId) {
      try {
        const result = await purchaseProduct(product.appleProductId);
        if (result) {
          const verifyRes = await fetch("/api/apple/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId: result.transactionId }),
          });
          if (verifyRes.ok) {
            await refreshUser();
          } else {
            setError("Purchase verification failed. Please contact support.");
          }
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

    // Web: use Stripe checkout
    const passPriceId = getRegionalStripePriceId(product);
    if (!passPriceId) {
      setError("Products are not configured yet. Please contact support.");
      setBuying(null);
      return;
    }

    try {
      const res = await fetch("/api/stripe/pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: passPriceId,
          passType: product.passType,
        }),
      });
      const data = await res.json();
      if (data.url) {
        const price = getRegionalPrice(product);
        trackEvent("begin_checkout", {
          currency: displayCurrencyId,
          value: price / 100,
          items: [{ item_id: `day_pass_${product.passType}`, item_name: product.name, price: price / 100, quantity: 1 }],
        });
        openInAppBrowser(data.url);
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBuying(null);
    }
  };

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

  // Compute savings for passes (using regional prices)
  const passesWithPerDay = passProducts.map((p) => {
    const price = getRegionalPrice(p);
    return {
      product: p,
      perDay: p.passDays ? price / p.passDays : price,
    };
  });
  const maxPerDay = passesWithPerDay.length > 0 ? Math.max(...passesWithPerDay.map((w) => w.perDay)) : 0;
  const minPerDay = passesWithPerDay.length > 0 ? Math.min(...passesWithPerDay.map((w) => w.perDay)) : 0;

  // Discount calculation helper (uses regional usual price)
  const getDiscountPercent = (product: Product) => {
    const usualPrice = getRegionalUsualPrice(product);
    const price = getRegionalPrice(product);
    if (!usualPrice || usualPrice <= price) return null;
    return Math.round((1 - price / usualPrice) * 100);
  };

  const plusDiscount = getDiscountPercent(activeProduct as Product);

  // Free tier price display
  const freePrice = `${prefixSymbol(displayCurrencySymbol)}0`;

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-3 px-3 py-3 bg-background/80 backdrop-blur-lg md:static md:mx-0 md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none">
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
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-text-primary transition-transform ${annual ? "left-[22px]" : "left-0.5"}`}
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
      </div>

      <div className="grid gap-4 md:grid-cols-3 max-w-5xl mx-auto">
        {/* Free tier card */}
        <Card variant="glass" className="relative flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{freeTier.name}</h3>
            <p className="text-sm text-text-secondary">{freeTier.description}</p>
          </div>
          <div className="text-3xl font-semibold text-text-primary">{freePrice}</div>
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

        {/* Plus tier card */}
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
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-text-primary">
                {getApplePriceString(activeProduct as Product)
                  ? `${getApplePriceString(activeProduct as Product)}${activeProduct.billingInterval === "MONTH" ? "/mo" : activeProduct.billingInterval === "YEAR" ? "/yr" : ""}`
                  : formatPrice(getDisplayPrice(activeProduct as Product), activeProduct.billingInterval)}
              </span>
              {!isIOS && plusDiscount && getRegionalUsualPrice(activeProduct as Product) && (
                <>
                  <span className="text-lg text-text-tertiary line-through">
                    {formatPrice(getRegionalUsualPrice(activeProduct as Product)!, activeProduct.billingInterval)}
                  </span>
                  <Badge variant="accent">{t("discount", { percent: plusDiscount })}</Badge>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-emerald-400/80">{t("guarantee")}</p>
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

        {/* Day Passes card */}
        <Card variant="glass" className="relative flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{t("dayPassTitle")}</h3>
            <p className="text-sm text-text-secondary">{t("dayPassSubtitle")}</p>
          </div>

          {passProducts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-text-tertiary">Pass products coming soon</p>
            </div>
          ) : (
            <div className="flex-1 space-y-3">
              {passProducts.map((product) => {
                const displayPrice = getDisplayPrice(product);
                const applePriceStr = getApplePriceString(product);
                const thisPerDay = product.passDays
                  ? displayPrice / product.passDays
                  : displayPrice;
                let savingsBadge: string | null = null;
                if (thisPerDay === minPerDay && passProducts.length > 1) {
                  savingsBadge = "Best per-day rate";
                } else if (thisPerDay < maxPerDay) {
                  const pct = Math.round((1 - thisPerDay / maxPerDay) * 100);
                  if (pct > 0) savingsBadge = `Save ${pct}%`;
                }

                const passDiscount = isIOS ? null : getDiscountPercent(product);

                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-elevated p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-text-primary">
                          {applePriceStr ?? formatPrice(displayPrice)}
                        </span>
                        {!isIOS && getRegionalUsualPrice(product) && getRegionalUsualPrice(product)! > getRegionalPrice(product) && (
                          <span className="text-xs text-text-tertiary line-through">
                            {formatPrice(getRegionalUsualPrice(product)!)}
                          </span>
                        )}
                        {passDiscount && (
                          <Badge variant="accent" className="text-[10px]">{passDiscount}% off</Badge>
                        )}
                        {savingsBadge && !passDiscount && (
                          <Badge variant="accent" className="text-[10px]">{savingsBadge}</Badge>
                        )}
                      </div>
                      <div className="text-xs text-text-secondary">{product.name}</div>
                      {product.passDays && (
                        <div className="text-[10px] text-text-tertiary">
                          {perDayRate(displayPrice, product.passDays)}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={buying === product.id}
                      onClick={() => handleBuyPass(product)}
                    >
                      {buying === product.id ? "..." : "Buy"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] text-text-tertiary">
            {t("dayPassNote")}
          </p>
        </Card>
      </div>

      {error && (
        <p className="text-center text-sm text-danger-fg">{error}</p>
      )}
      <p className="text-center text-xs text-text-tertiary">{t("guarantee")}</p>
    </div>
  );
}
