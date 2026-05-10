"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
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

interface PerformanceData {
  dates: string[];
  portfolioValues: number[];
  summary: {
    rangeReturn: number;
    totalReturnPct: number;
    weightedUpside: number;
    weightedBuyPct: number;
    winRate: number;
    holdingsCount: number;
  } | null;
}

type Range = "1m" | "3m" | "6m" | "1y";

const RANGES: { label: string; value: Range }[] = [
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "1Y", value: "1y" },
];

const STRATEGY_ICON: Record<string, string> = {
  ANALYST_CONVICTION: "◆",
  BALANCED: "◈",
  GROWTH: "▲",
  VALUE_INCOME: "◉",
  ETF_CORE: "⬡",
  SECTOR_FOCUS: "◎",
};

function ReturnTag({ value }: { value: number }) {
  const cls = value >= 0 ? "text-success-fg" : "text-danger-fg";
  const sign = value >= 0 ? "+" : "";
  return <span className={`font-semibold ${cls}`}>{sign}{value.toFixed(1)}%</span>;
}

function PerformanceChart({
  dates,
  values,
}: {
  dates: string[];
  values: number[];
}) {
  if (dates.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-text-tertiary">
        Not enough data for this range
      </div>
    );
  }

  const W = 600;
  const H = 180;
  const PAD = { top: 12, right: 12, bottom: 24, left: 40 };

  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const toX = (i: number) =>
    PAD.left + (i / (values.length - 1)) * (W - PAD.left - PAD.right);
  const toY = (v: number) =>
    PAD.top + ((maxV - v) / range) * (H - PAD.top - PAD.bottom);

  const pts = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const positive = values[values.length - 1] >= values[0];
  const lineColor = positive ? "var(--success-fg)" : "var(--danger-fg)";
  const fillId = `grad-${positive ? "pos" : "neg"}`;

  // Baseline at 100
  const baseY = toY(100);
  const showBaseline = baseY > PAD.top && baseY < H - PAD.bottom;

  // Y-axis labels
  const yLabels = [minV, 100, maxV].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);

  // X-axis ticks (up to 5)
  const xTicks = [0, Math.floor(dates.length / 4), Math.floor(dates.length / 2), Math.floor((3 * dates.length) / 4), dates.length - 1]
    .filter((i) => i >= 0 && i < dates.length)
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: "180px" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Baseline */}
      {showBaseline && (
        <line
          x1={PAD.left}
          y1={baseY}
          x2={W - PAD.right}
          y2={baseY}
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      )}

      {/* Fill */}
      <polygon
        points={`${toX(0).toFixed(1)},${H - PAD.bottom} ${pts} ${toX(values.length - 1).toFixed(1)},${H - PAD.bottom}`}
        fill={`url(#${fillId})`}
      />

      {/* Line */}
      <polyline
        points={pts}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Y-axis labels */}
      {yLabels.map((v) => (
        <text
          key={v}
          x={PAD.left - 4}
          y={toY(v) + 4}
          textAnchor="end"
          fontSize="9"
          fill="var(--text-tertiary)"
        >
          {v.toFixed(0)}
        </text>
      ))}

      {/* X-axis labels */}
      {xTicks.map((i) => (
        <text
          key={i}
          x={toX(i)}
          y={H - 4}
          textAnchor="middle"
          fontSize="9"
          fill="var(--text-tertiary)"
        >
          {dates[i]?.slice(5)}
        </text>
      ))}
    </svg>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-text-primary">{value}</div>
      <div className="mt-0.5 text-xs text-text-tertiary">{label}</div>
    </div>
  );
}

export function DemoPortfoliosContent({ initialPortfolioId = "" }: { initialPortfolioId?: string }) {
  const [portfolios, setPortfolios] = useState<DemoPortfolio[]>([]);
  const [portfoliosLoading, setPortfoliosLoading] = useState(true);
  const [activeId, setActiveId] = useState(initialPortfolioId);
  const [range, setRange] = useState<Range>("3m");
  // Track fetch params alongside data so we can derive loading state
  const [perfState, setPerfState] = useState<{
    data: PerformanceData | null;
    forId: string;
    forRange: string;
  }>({ data: null, forId: "", forRange: "" });

  const perf = perfState.data;
  const perfLoading = !!(activeId && (perfState.forId !== activeId || perfState.forRange !== range));

  useEffect(() => {
    fetch("/api/demo-portfolios")
      .then((r) => r.json())
      .then((data: DemoPortfolio[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setPortfolios(data);
          if (!initialPortfolioId || !data.find((p) => p.id === initialPortfolioId)) {
            setActiveId(data[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setPortfoliosLoading(false));
  }, [initialPortfolioId]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    const fetchId = activeId;
    const fetchRange = range;
    fetch(`/api/demo-portfolios/${activeId}/performance?range=${range}`)
      .then((res) => res.json())
      .then((data: PerformanceData) => {
        if (!cancelled) setPerfState({ data, forId: fetchId, forRange: fetchRange });
      })
      .catch(() => {
        if (!cancelled) setPerfState({ data: null, forId: fetchId, forRange: fetchRange });
      });
    return () => { cancelled = true; };
  }, [activeId, range]);

  const activePortfolio = portfolios.find((p) => p.id === activeId);

  return (
    <div className="min-h-screen">
      <Navbar />

      <Container className="pb-24 pt-8">
        <SectionHeader
          overline="Demo Portfolios"
          title="Analyst-driven model portfolios"
          subtitle="Six rules-based baskets built on analyst consensus data. Statistical illustration only — updated daily using end-of-day prices."
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Portfolio list */}
          <div className="space-y-2">
            {portfoliosLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
                ))
              : null}
            {!portfoliosLoading && portfolios.map((p) => {
              const snap = p.snapshots?.[0];
              const ret = snap?.returnPct ?? 0;
              const icon = STRATEGY_ICON[p.strategy] ?? "◆";
              const isActive = p.id === activeId;

              return (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                    isActive
                      ? "border-accent-fg bg-surface-elevated"
                      : "border-border bg-surface hover:border-border hover:bg-surface-elevated"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-text-primary">
                      <span className="mr-1.5 text-accent-fg">{icon}</span>
                      {p.name}
                    </span>
                    {snap && <ReturnTag value={ret} />}
                  </div>
                  <p className="mt-1 text-xs text-text-tertiary line-clamp-1">
                    {p.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Chart + stats */}
          <div className="space-y-4">
            {activePortfolio && (
              <Card variant="glass">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-text-primary">
                      {activePortfolio.name}
                    </h2>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {activePortfolio.description}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {RANGES.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setRange(r.value)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          range === r.value
                            ? "bg-accent-fg text-surface-elevated"
                            : "bg-surface text-text-secondary hover:bg-surface-elevated"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  {perfLoading ? (
                    <div className="flex h-48 items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent-fg" />
                    </div>
                  ) : perf ? (
                    <PerformanceChart dates={perf.dates} values={perf.portfolioValues} />
                  ) : (
                    <div className="flex h-48 items-center justify-center text-sm text-text-tertiary">
                      No data available
                    </div>
                  )}
                </div>

                {perf?.summary && (
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
                    <StatItem
                      label={`${range.toUpperCase()} Return`}
                      value={`${perf.summary.rangeReturn >= 0 ? "+" : ""}${perf.summary.rangeReturn.toFixed(1)}%`}
                    />
                    <StatItem
                      label="Analyst Upside"
                      value={`+${perf.summary.weightedUpside.toFixed(1)}%`}
                    />
                    <StatItem
                      label="Buy Consensus"
                      value={`${perf.summary.weightedBuyPct.toFixed(0)}%`}
                    />
                    <StatItem
                      label="Holdings"
                      value={String(perf.summary.holdingsCount)}
                    />
                  </div>
                )}

                <p className="mt-3 text-xs text-text-tertiary">
                  Normalised index starting at 100 · EOD prices · statistical illustration only
                </p>
              </Card>
            )}

            {/* Upgrade CTA */}
            <Card variant="accent" padding="lg">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Badge variant="accent">Paid feature</Badge>
                  <h3 className="mt-2 text-base font-semibold text-text-primary">
                    Build your own analyst-driven portfolio
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    Choose a preset strategy, customise the filters, set weights, and track performance over time.
                  </p>
                </div>
                <Link href="/pricing">
                  <Button size="sm">Upgrade to Plus or Pass</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-12 rounded-xl border border-border-subtle bg-surface p-4 text-center text-xs text-text-tertiary">
          These portfolios are built on analyst consensus price targets. They are statistical illustrations of how a rules-based selection of assets has performed historically. This is not investment advice. Past performance does not predict future results. Data is updated once daily using end-of-day prices.
        </div>
      </Container>

      <Footer />
    </div>
  );
}
