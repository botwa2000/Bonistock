"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { brokers, regionConfigs } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function BrokerComparison() {
  const t = useTranslations("brokers");
  const { user } = useAuth();
  const region = (user?.region ?? "US").toLowerCase() as "us" | "de";

  const regionBrokers = brokers.filter((b) => b.regions.includes(region));
  const config = regionConfigs[region];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {regionBrokers.map((broker) => (
          <Card key={broker.name} variant="glass" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white">
                {broker.logo}
              </div>
              <div className="flex gap-1.5">
                {broker.sparplan && (
                  <Badge variant="info">Sparplan</Badge>
                )}
                {broker.fractional && (
                  <Badge variant="success">{t("fractional")}</Badge>
                )}
              </div>
            </div>
            <h3 className="text-base font-semibold text-white">
              {broker.name}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-white/70">
                <span>{t("commission")}</span>
                <span className="text-white">{broker.commission}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>{t("minDeposit")}</span>
                <span className="text-white">{broker.minDeposit}</span>
              </div>
              {broker.sparplan && broker.sparplanMin && (
                <div className="flex justify-between text-white/70">
                  <span>Sparplan min.</span>
                  <span className="text-white">{broker.sparplanMin}</span>
                </div>
              )}
            </div>
            <ul className="space-y-1.5 text-xs text-white/70">
              {broker.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant="secondary" size="sm" className="mt-auto">
              {broker.cta}
            </Button>
          </Card>
        ))}
      </div>

      {config.taxNote && (
        <Card variant="glass" padding="sm" className="border-amber-400/20">
          <div className="flex items-start gap-2 text-xs text-white/60">
            <span className="text-amber-400">Tax info:</span>
            <span>{config.taxNote}</span>
          </div>
        </Card>
      )}

      <p className="text-xs text-white/40 text-center">{t("disclaimer")}</p>
    </div>
  );
}
