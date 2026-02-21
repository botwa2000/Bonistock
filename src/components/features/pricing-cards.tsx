"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { pricingTiers } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PricingCards() {
  const t = useTranslations("pricing");
  const [annual, setAnnual] = useState(false);

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
        {pricingTiers.map((tier) => (
          <Card
            key={tier.name}
            variant={tier.highlighted ? "accent" : "glass"}
            className={`relative flex flex-col gap-4 ${tier.highlighted ? "ring-2 ring-emerald-300/50" : ""}`}
          >
            {tier.highlighted && (
              <Badge
                variant="accent"
                className="absolute -top-3 left-1/2 -translate-x-1/2"
              >
                {t("popular")}
              </Badge>
            )}
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{tier.name}</h3>
              <p className="text-sm text-text-secondary">{tier.description}</p>
            </div>
            <div className="text-3xl font-semibold text-text-primary">
              {annual && tier.priceAnnual ? tier.priceAnnual : tier.price}
            </div>
            <ul className="flex-1 space-y-2 text-sm text-text-secondary">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-300" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/login">
              <Button
                variant={tier.highlighted ? "primary" : "secondary"}
                fullWidth
              >
                {tier.cta}
              </Button>
            </Link>
          </Card>
        ))}
      </div>

      <p className="text-center text-xs text-text-tertiary">{t("guarantee")}</p>
    </div>
  );
}
