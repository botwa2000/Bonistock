"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";

interface DemoPortfolio {
  id: string;
  name: string;
  description: string;
  strategy: string;
  snapshots: Array<{ returnPct: number; totalValue: number }>;
}

const STRATEGY_ICONS: Record<string, string> = {
  ANALYST_CONVICTION: "◆",
  BALANCED: "◈",
  GROWTH: "▲",
  VALUE_INCOME: "◉",
  ETF_CORE: "⬡",
  SECTOR_FOCUS: "◎",
};

const STRATEGY_COLOR: Record<string, string> = {
  ANALYST_CONVICTION: "border-l-accent-fg",
  BALANCED: "border-l-border",
  GROWTH: "border-l-success-fg",
  VALUE_INCOME: "border-l-warning-fg",
  ETF_CORE: "border-l-link-fg",
  SECTOR_FOCUS: "border-l-accent-fg",
};

function ReturnBadge({ value }: { value: number }) {
  if (value >= 0) {
    return (
      <span className="text-sm font-bold text-success-fg">
        +{value.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="text-sm font-bold text-danger-fg">
      {value.toFixed(1)}%
    </span>
  );
}

export function DemoPortfolioSection() {
  const [portfolios, setPortfolios] = useState<DemoPortfolio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/demo-portfolios")
      .then((r) => r.json())
      .then((data: DemoPortfolio[]) => {
        if (Array.isArray(data)) setPortfolios(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && portfolios.length === 0) return null;

  return (
    <section>
      <SectionHeader
        overline="Demo Portfolios"
        title="See analyst consensus in action"
        subtitle="Six model portfolios built on real analyst data. Track how analyst-selected baskets perform — before you commit to anything."
        action={
          <Link href="/demo-portfolios">
            <Button variant="secondary" size="sm">
              Explore all portfolios
            </Button>
          </Link>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} variant="glass" className="animate-pulse min-h-[120px]">{null}</Card>
            ))
          : portfolios.map((p) => {
              const snap = p.snapshots?.[0];
              const ret = snap?.returnPct ?? 0;
              const icon = STRATEGY_ICONS[p.strategy] ?? "◆";
              const borderColor = STRATEGY_COLOR[p.strategy] ?? "border-l-border";

              return (
                <Link key={p.id} href={`/demo-portfolios?portfolio=${p.id}`}>
                  <Card
                    variant="glass"
                    hover
                    className={`border-l-2 ${borderColor} h-full transition-all`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg text-accent-fg">{icon}</span>
                        <span className="text-sm font-semibold text-text-primary">
                          {p.name}
                        </span>
                      </div>
                      {snap && <ReturnBadge value={ret} />}
                    </div>
                    <p className="mt-2 text-xs text-text-secondary line-clamp-2">
                      {p.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant="default" className="text-xs">
                        {p.strategy.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-text-tertiary">
                        {snap ? "Since inception" : "No data yet"}
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-text-tertiary">
          Statistical illustration using analyst consensus data · updated daily · not investment advice
        </p>
      </div>
    </section>
  );
}
