"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { EtfPick, EtfFilters } from "@/lib/types";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { EtfCard } from "@/components/features/etf-card";
import { EtfFilterBar, defaultEtfFilters } from "@/components/features/filter-bar";

export default function EtfsPage() {
  const t = useTranslations("nav");
  const tf = useTranslations("filters");

  const [etfs, setEtfs] = useState<EtfPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EtfFilters>(defaultEtfFilters);

  useEffect(() => {
    fetch("/api/etfs")
      .then((r) => r.json())
      .then((data) => { setEtfs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const themes = useMemo(
    () => [...new Set(etfs.map((e) => e.theme))].sort(),
    [etfs]
  );

  const filtered = useMemo(() => {
    return etfs.filter((e) => {
      if (filters.region !== "all" && e.region !== filters.region) return false;
      if (filters.theme !== "all" && e.theme !== filters.theme) return false;
      if (filters.broker !== "any" && !e.brokerAvailability.includes(filters.broker as any))
        return false;
      if (e.fee > filters.maxFee) return false;
      if (e.sharpe < filters.minSharpe) return false;
      return true;
    });
  }, [etfs, filters]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
      </div>
    );
  }

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
          <p className="text-text-secondary">{tf("noResults")}</p>
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
