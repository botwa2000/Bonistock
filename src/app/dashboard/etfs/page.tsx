"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { etfPicks } from "@/lib/mock-data";
import type { EtfFilters } from "@/lib/types";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { EtfCard } from "@/components/features/etf-card";
import { EtfFilterBar, defaultEtfFilters } from "@/components/features/filter-bar";

export default function EtfsPage() {
  const t = useTranslations("nav");
  const tf = useTranslations("filters");

  const [filters, setFilters] = useState<EtfFilters>(defaultEtfFilters);

  const themes = useMemo(
    () => [...new Set(etfPicks.map((e) => e.theme))].sort(),
    []
  );

  const filtered = useMemo(() => {
    return etfPicks.filter((e) => {
      if (filters.region !== "all" && e.region !== filters.region) return false;
      if (filters.theme !== "all" && e.theme !== filters.theme) return false;
      if (filters.broker !== "any" && !e.brokerAvailability.includes(filters.broker as any))
        return false;
      if (e.fee > filters.maxFee) return false;
      if (e.sharpe < filters.minSharpe) return false;
      return true;
    });
  }, [filters]);

  return (
    <div className="space-y-6">
      <SectionHeader
        overline="ETF Explorer"
        title="Diversified anchors for your portfolio"
        subtitle="Top ETFs by category with key metrics. Every auto-mix includes an ETF safety anchor."
      />

      <EtfFilterBar
        filters={filters}
        onChange={setFilters}
        resultCount={filtered.length}
        themes={themes}
      />

      {filtered.length === 0 ? (
        <Card variant="glass" className="py-12 text-center">
          <p className="text-white/60">{tf("noResults")}</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((etf) => (
            <EtfCard key={etf.symbol} etf={etf} />
          ))}
        </div>
      )}
    </div>
  );
}
