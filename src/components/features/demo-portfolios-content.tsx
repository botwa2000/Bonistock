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

type Range = "1m" | "3m" | "6m" | "1y" | "3y" | "5y";

const RANGES: { label: string; value: Range }[] = [
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "1Y", value: "1y" },
  { label: "3Y", value: "3y" },
  { label: "5Y", value: "5y" },
];

// Approximate calendar days per range (used for coverage check)
const RANGE_CALENDAR_DAYS: Record<Range, number> = {
  "1m": 30, "3m": 90, "6m": 180, "1y": 365, "3y": 1095, "5y": 1825,
};

const STRATEGY_ICON: Record<string, string> = {
  ANALYST_CONVICTION: "◆",
  BALANCED: "◈",
  GROWTH: "▲",
  VALUE_INCOME: "◉",
  ETF_CORE: "⬡",
  SECTOR_FOCUS: "◎",
};

// Returns true when the returned dates span ≥70% of the requested range in calendar days.
// Using actual span (first→last date) instead of count distinguishes "sparse trading days
// within a full 1M window" from "portfolio simply doesn't have 3Y of history yet".
function hasSufficientCoverage(dates: string[], range: Range): boolean {
  if (dates.length < 2) return false;
  const calDays = RANGE_CALENDAR_DAYS[range];
  if (!calDays) return true;
  const spanMs = new Date(dates[dates.length - 1] + "T00:00:00Z").getTime()
    - new Date(dates[0] + "T00:00:00Z").getTime();
  const spanDays = spanMs / (1000 * 60 * 60 * 24);
  return spanDays >= calDays * 0.70;
}

function fmtDays(n: number): string {
  if (n >= 365) return `${(n / 365).toFixed(1).replace(".0", "")}y`;
  if (n >= 30) return `${Math.round(n / 30)}mo`;
  return `${n}d`;
}

function ReturnTag({ value }: { value: number }) {
  const cls = value >= 0 ? "text-success-fg" : "text-danger-fg";
  const sign = value >= 0 ? "+" : "";
  return <span className={`font-semibold ${cls}`}>{sign}{value.toFixed(1)}%</span>;
}

function SidebarSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const W = 56;
  const H = 20;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const r = max - min || 1;
  const toX = (i: number) => (i / (values.length - 1)) * W;
  const toY = (v: number) => H - ((v - min) / r) * (H - 2) - 1;
  const pts = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const positive = values[values.length - 1] >= values[0];
  const color = positive ? "var(--success-fg)" : "var(--danger-fg)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H }} aria-hidden="true" className="opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function PerformanceChart({ dates, values }: { dates: string[]; values: number[] }) {
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
  const r = maxV - minV || 1;

  const toX = (i: number) =>
    PAD.left + (i / (values.length - 1)) * (W - PAD.left - PAD.right);
  const toY = (v: number) =>
    PAD.top + ((maxV - v) / r) * (H - PAD.top - PAD.bottom);

  const pts = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const positive = values[values.length - 1] >= values[0];
  const lineColor = positive ? "var(--success-fg)" : "var(--danger-fg)";
  const fillId = `grad-${positive ? "pos" : "neg"}`;

  const baseY = toY(100);
  const showBaseline = baseY > PAD.top && baseY < H - PAD.bottom;

  const yLabels = [minV, 100, maxV].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  const xTicks = [0, Math.floor(dates.length / 4), Math.floor(dates.length / 2), Math.floor((3 * dates.length) / 4), dates.length - 1]
    .filter((i) => i >= 0 && i < dates.length)
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "180px" }} aria-hidden="true">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showBaseline && (
        <line x1={PAD.left} y1={baseY} x2={W - PAD.right} y2={baseY}
          stroke="var(--border)" strokeWidth="1" strokeDasharray="4 3" />
      )}
      <polygon
        points={`${toX(0).toFixed(1)},${H - PAD.bottom} ${pts} ${toX(values.length - 1).toFixed(1)},${H - PAD.bottom}`}
        fill={`url(#${fillId})`}
      />
      <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" />
      {yLabels.map((v) => (
        <text key={v} x={PAD.left - 4} y={toY(v) + 4} textAnchor="end" fontSize="9" fill="var(--text-tertiary)">
          {v.toFixed(0)}
        </text>
      ))}
      {xTicks.map((i) => (
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--text-tertiary)">
          {dates[i]?.slice(5)}
        </text>
      ))}
    </svg>
  );
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function StatItem({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${muted ? "text-text-tertiary" : "text-text-primary"}`}>{value}</div>
      <div className="mt-0.5 text-xs text-text-tertiary">{label}</div>
    </div>
  );
}

function DataCoverageNote({
  range,
  dates,
}: {
  range: Range;
  dates: string[];
}) {
  if (dates.length < 2) return null;
  if (hasSufficientCoverage(dates, range)) return null;

  const actualDays = Math.round(
    (new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / (1000 * 60 * 60 * 24)
  );
  const since = fmtDate(dates[0]);
  const rangeLabel = range.toUpperCase();
  const actualLabel = fmtDays(actualDays);

  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-border-subtle bg-surface px-3 py-2.5 text-xs text-text-secondary">
      <span className="mt-0.5 shrink-0 text-text-tertiary">ⓘ</span>
      <span>
        <span className="font-medium text-text-primary">{rangeLabel} data not yet available.</span>
        {" "}This portfolio has {actualLabel} of history (since {since}). Return and chart reflect available data only — history grows daily.
      </span>
    </div>
  );
}

export function DemoPortfoliosContent({ initialPortfolioId = "" }: { initialPortfolioId?: string }) {
  const [portfolios, setPortfolios] = useState<DemoPortfolio[]>([]);
  const [portfoliosLoading, setPortfoliosLoading] = useState(true);
  const [activeId, setActiveId] = useState(initialPortfolioId);
  const [range, setRange] = useState<Range>("1m");
  const [perfState, setPerfState] = useState<{
    data: PerformanceData | null;
    forId: string;
    forRange: string;
  }>({ data: null, forId: "", forRange: "" });
  // Pre-fetched 1M perf for sidebar sparklines — always 1M regardless of selected range
  const [sidebarPerf, setSidebarPerf] = useState<Map<string, { values: number[]; ret: number } | null>>(new Map());

  const perf = perfState.data;
  const perfLoading = !!(activeId && (perfState.forId !== activeId || perfState.forRange !== range));

  const rangeInsufficient = !!(perf && !hasSufficientCoverage(perf.dates, range));

  useEffect(() => {
    fetch("/api/demo-portfolios")
      .then((r) => r.json())
      .then((data: DemoPortfolio[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setPortfolios(data);
          if (!initialPortfolioId || !data.find((p) => p.id === initialPortfolioId)) {
            setActiveId(data[0].id);
          }
          // Pre-fetch 1M for all portfolios (sidebar sparklines + consistent comparison metric)
          data.forEach((p) => {
            fetch(`/api/demo-portfolios/${p.id}/performance?range=1m`)
              .then((r) => r.json())
              .then((d: PerformanceData) => {
                setSidebarPerf((prev) => new Map(prev).set(p.id,
                  d.portfolioValues?.length && d.summary
                    ? { values: d.portfolioValues, ret: d.summary.rangeReturn }
                    : null
                ));
              })
              .catch(() => {
                setSidebarPerf((prev) => new Map(prev).set(p.id, null));
              });
          });
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
          {/* Sidebar portfolio list */}
          <div className="space-y-2">
            {portfoliosLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
                ))
              : null}
            {!portfoliosLoading && portfolios.map((p) => {
              const icon = STRATEGY_ICON[p.strategy] ?? "◆";
              const isActive = p.id === activeId;
              const sidebar1m = sidebarPerf.get(p.id); // undefined = loading, null = no data
              const sidebarFetched = sidebarPerf.has(p.id);

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
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text-primary truncate">
                      <span className="mr-1.5 text-accent-fg">{icon}</span>
                      {p.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {!sidebarFetched ? (
                        <div className="h-3 w-10 animate-pulse rounded bg-surface-elevated" />
                      ) : sidebar1m ? (
                        <>
                          {!isActive && <SidebarSparkline values={sidebar1m.values} />}
                          <span className="flex items-center gap-1">
                            <ReturnTag value={sidebar1m.ret} />
                            <span className="text-xs text-text-tertiary">1M</span>
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-text-tertiary">N/A</span>
                      )}
                    </div>
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
                      value={rangeInsufficient ? "N/A" : `${perf.summary.rangeReturn >= 0 ? "+" : ""}${perf.summary.rangeReturn.toFixed(2)}%`}
                      muted={rangeInsufficient}
                    />
                    <StatItem
                      label="Analyst Upside"
                      value={`${perf.summary.weightedUpside >= 0 ? "+" : ""}${perf.summary.weightedUpside.toFixed(1)}%`}
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

                {/* Coverage note — only shown when selected range exceeds available history */}
                {!perfLoading && perf && (
                  <DataCoverageNote range={range} dates={perf.dates} />
                )}

                <p className="mt-3 text-xs text-text-tertiary">
                  {perf?.dates && perf.dates.length >= 2
                    ? `${fmtDate(perf.dates[0])} – ${fmtDate(perf.dates[perf.dates.length - 1])} · normalised to 100 · EOD prices · not investment advice`
                    : "Normalised to 100 · EOD prices · not investment advice"}
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
