"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { stockPicks } from "@/lib/mock-data";
import type { RiskLevel, MixAllocation } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";

export function AutoMix() {
  const t = useTranslations("mix");
  const [amount, setAmount] = useState(500);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "any">("any");

  const result = useMemo(() => {
    const candidates =
      riskFilter === "any"
        ? stockPicks
        : stockPicks.filter((p) => p.risk === riskFilter);

    const ranked = [...candidates].sort((a, b) => b.upside - a.upside);
    const top = ranked.slice(0, 4);
    const weightSum = top.reduce((sum, _, idx) => sum + (4 - idx), 0);

    const allocations: MixAllocation[] = top.map((p, idx) => {
      const weight = (4 - idx) / weightSum;
      const dollars = Math.round(amount * weight * 100) / 100;
      const shares = Math.floor((dollars / p.price) * 100) / 100;
      const spend = Math.round(shares * p.price * 100) / 100;
      return {
        symbol: p.symbol,
        name: p.name,
        price: p.price,
        risk: p.risk,
        weight,
        dollars,
        shares,
        spend,
        upside: p.upside,
      };
    });

    const spent = allocations.reduce((s, a) => s + a.spend, 0);
    const cash = Math.round((amount - spent) * 100) / 100;
    return { allocations, cash, totalInvested: spent };
  }, [amount, riskFilter]);

  const riskVariant = (risk: RiskLevel) =>
    risk === "low" ? "success" : risk === "high" ? "danger" : "warning";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4">
        <Card variant="glass" padding="sm" className="flex items-center gap-3">
          <Input
            label={t("amount")}
            id="mix-amount"
            type="number"
            value={amount}
            min={50}
            max={10000}
            step={50}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
          />
        </Card>
        <Card variant="glass" padding="sm" className="flex items-center gap-3">
          <Select
            label={t("riskPreference")}
            id="mix-risk"
            value={riskFilter}
            onChange={(v) => setRiskFilter(v as RiskLevel | "any")}
            options={[
              { value: "any", label: t("anyRisk") },
              { value: "low", label: t("low") },
              { value: "balanced", label: t("balanced") },
              { value: "high", label: t("high") },
            ]}
          />
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {result.allocations.map((alloc) => (
          <Card key={alloc.symbol} variant="dark">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">{alloc.symbol}</span>
              <Badge>{Math.round(alloc.weight * 100)}%</Badge>
            </div>
            <div className="mt-2 text-xs text-white/60">
              ${alloc.price.toFixed(2)} &middot;{" "}
              <Badge variant={riskVariant(alloc.risk)} className="text-[10px]">
                {alloc.risk}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-white">
              <div>
                <div className="text-[11px] uppercase text-white/60">
                  {t("dollars")}
                </div>
                <div className="text-base font-semibold">
                  ${alloc.dollars.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase text-white/60">
                  {t("shares")}
                </div>
                <div className="text-base font-semibold">
                  {alloc.shares.toFixed(2)}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card
        variant="glass"
        padding="sm"
        className="flex items-center justify-between px-4 py-3"
      >
        <span className="text-sm text-white/70">
          {t("unusedCash")}
        </span>
        <Badge variant="default" className="text-sm font-semibold">
          ${result.cash.toFixed(2)}
        </Badge>
      </Card>

      <div className="flex gap-3">
        <Link href="/dashboard/brokers">
          <Button>{t("execute")}</Button>
        </Link>
        <Button variant="secondary">{t("saveMix")}</Button>
      </div>
    </div>
  );
}
