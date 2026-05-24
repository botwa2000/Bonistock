"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Holding {
  id: string;
  symbol: string;
  assetType: string;
  weight: number;
}

interface Portfolio {
  id: string;
  name: string;
  strategy: string;
  weightMode: string;
  createdAt: string;
  holdings: Holding[];
}

interface HoldingData {
  symbol: string;
  name: string;
  assetType: string;
  weight: number;
  sector: string;
  region: string;
  risk: string | null;
  upside: number | null;
  buys: number | null;
  holds: number | null;
  sells: number | null;
  price: number | null;
  dividendYield: number | null;
  beta: number | null;
  pe: number | null;
}

interface PerfSummary {
  rangeReturn: number;
  weightedUpside: number;
  weightedBuyPct: number;
  weightedBeta: number | null;
  weightedDividendYield: number | null;
  holdingsCount: number;
  totalWeight: number;
}

interface PerfData {
  dates: string[];
  portfolioValues: number[];
  summary: PerfSummary | null;
  holdingsData: HoldingData[];
  breakdown: {
    sector: Record<string, number>;
    region: Record<string, number>;
    risk: Record<string, number>;
  } | null;
}

interface SearchResult {
  symbol: string;
  name: string;
  assetType: "STOCK" | "ETF";
  sector: string | null;
  upside: number | null;
  risk: string | null;
  price: number | null;
  analysts: number | null;
}

type SortKey = "symbol" | "name" | "weight" | "sector" | "risk" | "upside" | "buyPct" | "price";
type SortDir = "asc" | "desc";

// ─── Palette for charts ───────────────────────────────────────────────────────

const PALETTE = [
  "#34d399", "#60a5fa", "#f59e0b", "#a78bfa", "#f87171",
  "#38bdf8", "#fb923c", "#4ade80", "#c084fc", "#94a3b8",
];

// ─── SVG Donut Chart ─────────────────────────────────────────────────────────

function DonutChart({ data, label }: { data: Record<string, number>; label: string }) {
  const entries = Object.entries(data)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) return null;

  const R = 38;
  const CX = 50;
  const CY = 50;
  const circumference = 2 * Math.PI * R;
  const strokeWidth = 14;

  let offset = 0;
  const arcs = entries.map(([key, value], i) => {
    const pct = value / 100;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const arc = {
      key,
      value,
      color: PALETTE[i % PALETTE.length],
      dasharray: `${dash.toFixed(2)} ${gap.toFixed(2)}`,
      dashoffset: -offset * circumference,
    };
    offset += pct;
    return arc;
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">{label}</p>
      <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={arc.dasharray}
            strokeDashoffset={arc.dashoffset.toFixed(2)}
          />
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {arcs.slice(0, 5).map((arc) => (
          <div key={arc.key} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: arc.color }} />
            <span className="text-xs text-text-tertiary truncate max-w-[80px]" title={arc.key}>
              {arc.key} <span className="text-text-secondary">{arc.value.toFixed(0)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Performance Chart ────────────────────────────────────────────────────────

function PerformanceChart({ dates, values }: { dates: string[]; values: number[] }) {
  const [tooltip, setTooltip] = useState<{ index: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (dates.length < 2 || values.length < 2) return null;

  const W = 600;
  const H = 160;
  const PAD = { t: 16, r: 8, b: 28, l: 44 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const toX = (i: number) => PAD.l + (i / (values.length - 1)) * chartW;
  const toY = (v: number) => PAD.t + chartH - ((v - minV) / range) * chartH;

  const pts = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const isPositive = values[values.length - 1] >= 100;
  const lineColor = isPositive ? "var(--success-fg)" : "var(--danger-fg)";

  // Axis labels
  const yLabels = [minV, (minV + maxV) / 2, maxV];
  const xStep = Math.max(1, Math.floor(dates.length / 4));
  const xLabels = dates.filter((_, i) => i % xStep === 0 || i === dates.length - 1);

  function handleMouseMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const frac = (e.clientX - rect.left - (PAD.l / W) * rect.width) /
      ((chartW / W) * rect.width);
    const idx = Math.max(0, Math.min(values.length - 1, Math.round(frac * (values.length - 1))));
    setTooltip({ index: idx, x: toX(idx), y: toY(values[idx]) });
  }

  const fmt = (v: number) => {
    const ret = v - 100;
    return `${ret >= 0 ? "+" : ""}${ret.toFixed(2)}%`;
  };

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("en", { month: "short", day: "numeric" });
  };

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: "160px" }}
      >
        {/* Grid lines */}
        {yLabels.map((v, i) => {
          const y = toY(v);
          return (
            <g key={i}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
                stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={PAD.l - 4} y={y + 4} textAnchor="end"
                fontSize="9" fill="var(--text-tertiary)">
                {fmt(v)}
              </text>
            </g>
          );
        })}

        {/* X axis labels */}
        {xLabels.map((d) => {
          const i = dates.indexOf(d);
          return (
            <text key={d} x={toX(i)} y={H - 6} textAnchor="middle"
              fontSize="9" fill="var(--text-tertiary)">
              {fmtDate(d)}
            </text>
          );
        })}

        {/* Chart line */}
        <polyline points={pts} fill="none" stroke={lineColor}
          strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />

        {/* Hover crosshair */}
        {tooltip && (
          <>
            <line
              x1={tooltip.x} y1={PAD.t} x2={tooltip.x} y2={H - PAD.b}
              stroke="var(--border)" strokeWidth="1" strokeDasharray="3,2"
            />
            <circle cx={tooltip.x} cy={tooltip.y} r="3.5"
              fill={lineColor} />
          </>
        )}

        {/* Transparent overlay for mouse events */}
        <rect
          x={PAD.l} y={PAD.t} width={chartW} height={chartH}
          fill="transparent"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        />
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: `${(tooltip.x / W) * 100}%`,
            top: "8px",
            transform: tooltip.x / W > 0.7 ? "translateX(-110%)" : "translateX(8px)",
          }}
        >
          <p className="font-semibold text-text-primary">
            {fmt(values[tooltip.index])}
          </p>
          <p className="text-text-tertiary">{fmtDate(dates[tooltip.index])}</p>
        </div>
      )}
    </div>
  );
}

// ─── Analytics Summary ────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-surface px-3 py-2.5 min-w-[90px]">
      <span className="text-[10px] text-text-tertiary uppercase tracking-wide leading-none">{label}</span>
      <span className={`text-sm font-semibold leading-snug ${color ?? "text-text-primary"}`}>{value}</span>
    </div>
  );
}

function AnalyticsSummary({ summary, range }: { summary: PerfSummary; range: string }) {
  const retColor = summary.rangeReturn >= 0 ? "text-success-fg" : "text-danger-fg";
  const retStr = `${summary.rangeReturn >= 0 ? "+" : ""}${summary.rangeReturn.toFixed(2)}%`;
  const upsideStr = `+${summary.weightedUpside.toFixed(1)}%`;
  const buyStr = `${summary.weightedBuyPct.toFixed(0)}%`;
  const betaStr = summary.weightedBeta != null ? summary.weightedBeta.toFixed(2) : "—";
  const divStr = summary.weightedDividendYield != null
    ? `${summary.weightedDividendYield.toFixed(2)}%` : "—";

  return (
    <div className="flex flex-wrap gap-2">
      <StatCard label={`Return (${range})`} value={retStr} color={retColor} />
      <StatCard label="Analyst Upside" value={upsideStr} color="text-accent-fg" />
      <StatCard label="Buy Consensus" value={buyStr} />
      <StatCard label="Portfolio Beta" value={betaStr} />
      <StatCard label="Avg Div Yield" value={divStr} />
    </div>
  );
}

// ─── Holdings Table ───────────────────────────────────────────────────────────

function WeightBar({ weight, total }: { weight: number; total: number }) {
  const pct = total > 0 ? Math.min((weight / total) * 100, 100) : 0;
  return (
    <div className="h-1 w-16 rounded-full bg-border overflow-hidden">
      <div className="h-full rounded-full bg-accent-fg" style={{ width: `${pct}%` }} />
    </div>
  );
}

function RiskBadge({ risk }: { risk: string | null }) {
  if (!risk) return <span className="text-text-tertiary">—</span>;
  const v = risk === "LOW" ? "success" : risk === "HIGH" ? "danger" : "warning";
  return <Badge variant={v as "success" | "danger" | "warning"} className="text-[10px] px-1.5">{risk}</Badge>;
}

function HoldingsTable({
  holdings,
  portfolioId,
  onWeightSaved,
  onDeleted,
}: {
  holdings: HoldingData[];
  portfolioId: string;
  onWeightSaved: () => void;
  onDeleted: (symbol: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("weight");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editWeight, setEditWeight] = useState<{ symbol: string; value: string } | null>(null);
  const [savingWeight, setSavingWeight] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editRef.current) editRef.current.select(); }, [editWeight?.symbol]);

  const totalWeight = holdings.reduce((s, h) => s + h.weight, 0);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sorted = [...holdings].sort((a, b) => {
    let av: number | string | null = null;
    let bv: number | string | null = null;
    switch (sortKey) {
      case "symbol": av = a.symbol; bv = b.symbol; break;
      case "name": av = a.name; bv = b.name; break;
      case "weight": av = a.weight; bv = b.weight; break;
      case "sector": av = a.sector; bv = b.sector; break;
      case "risk": av = a.risk ?? ""; bv = b.risk ?? ""; break;
      case "upside": av = a.upside ?? -999; bv = b.upside ?? -999; break;
      case "buyPct": {
        const aTotal = (a.buys ?? 0) + (a.holds ?? 0) + (a.sells ?? 0);
        const bTotal = (b.buys ?? 0) + (b.holds ?? 0) + (b.sells ?? 0);
        av = aTotal > 0 ? (a.buys ?? 0) / aTotal : -1;
        bv = bTotal > 0 ? (b.buys ?? 0) / bTotal : -1;
        break;
      }
      case "price": av = a.price ?? -1; bv = b.price ?? -1; break;
    }
    if (typeof av === "string" && typeof bv === "string") {
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    const an = av as number ?? 0;
    const bn = bv as number ?? 0;
    return sortDir === "asc" ? an - bn : bn - an;
  });

  async function saveWeight(h: HoldingData, newWeightStr: string) {
    const w = parseFloat(newWeightStr);
    if (isNaN(w) || w <= 0 || w > 100 || w === h.weight) {
      setEditWeight(null);
      return;
    }
    setSavingWeight(h.symbol);
    setEditWeight(null);
    try {
      await fetch(`/api/user/portfolios/${portfolioId}/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: h.symbol, weight: w, assetType: h.assetType }),
      });
      onWeightSaved();
    } finally {
      setSavingWeight(null);
    }
  }

  async function deleteHolding(symbol: string) {
    setDeleting(symbol);
    try {
      await fetch(
        `/api/user/portfolios/${portfolioId}/holdings?symbol=${encodeURIComponent(symbol)}`,
        { method: "DELETE" }
      );
      onDeleted(symbol);
    } finally {
      setDeleting(null);
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="opacity-30 text-[10px]">↕</span>;
    return <span className="text-accent-fg text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const Th = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wide text-text-tertiary cursor-pointer select-none hover:text-text-secondary whitespace-nowrap"
      onClick={() => toggleSort(k)}
    >
      {label} <SortIcon k={k} />
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface border-b border-border">
          <tr>
            <Th label="Symbol" k="symbol" />
            <Th label="Name" k="name" />
            <Th label="Weight" k="weight" />
            <Th label="Sector" k="sector" />
            <Th label="Risk" k="risk" />
            <Th label="Upside" k="upside" />
            <Th label="Buy%" k="buyPct" />
            <Th label="Price" k="price" />
            <th className="px-3 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((h) => {
            const totalAnalysts = (h.buys ?? 0) + (h.holds ?? 0) + (h.sells ?? 0);
            const buyPct = totalAnalysts > 0 ? Math.round((h.buys ?? 0) / totalAnalysts * 100) : null;
            const upsideColor = h.upside == null ? "text-text-tertiary"
              : h.upside >= 20 ? "text-success-fg"
              : h.upside >= 5 ? "text-warning-fg"
              : "text-danger-fg";
            const isEditing = editWeight?.symbol === h.symbol;
            const isSaving = savingWeight === h.symbol;

            return (
              <tr key={h.symbol} className="border-b border-border last:border-0 hover:bg-surface/60 transition-colors">
                <td className="px-3 py-2.5">
                  <span className="font-semibold text-text-primary">{h.symbol}</span>
                  <Badge variant="default" className="ml-1.5 text-[10px] px-1">
                    {h.assetType}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-text-secondary max-w-[140px] truncate" title={h.name}>
                  {h.name}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-1">
                    {isEditing ? (
                      <input
                        ref={editRef}
                        type="number"
                        min="0.01" max="100" step="0.1"
                        defaultValue={h.weight.toFixed(1)}
                        className="w-16 rounded border border-accent-fg bg-input-bg px-1.5 py-0.5 text-xs text-text-primary focus:outline-none"
                        onBlur={(e) => saveWeight(h, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveWeight(h, e.currentTarget.value);
                          if (e.key === "Escape") setEditWeight(null);
                        }}
                      />
                    ) : (
                      <button
                        className="text-left text-text-primary font-medium hover:text-accent-fg transition-colors"
                        onClick={() => setEditWeight({ symbol: h.symbol, value: h.weight.toFixed(1) })}
                        title="Click to edit weight"
                        disabled={isSaving}
                      >
                        {isSaving ? "…" : `${h.weight.toFixed(1)}%`}
                      </button>
                    )}
                    <WeightBar weight={h.weight} total={totalWeight} />
                  </div>
                </td>
                <td className="px-3 py-2.5 text-text-secondary text-xs">{h.sector || "—"}</td>
                <td className="px-3 py-2.5"><RiskBadge risk={h.risk} /></td>
                <td className={`px-3 py-2.5 font-medium ${upsideColor}`}>
                  {h.upside != null ? `+${h.upside.toFixed(1)}%` : "—"}
                </td>
                <td className="px-3 py-2.5 text-text-secondary">
                  {buyPct != null ? `${buyPct}%` : "—"}
                </td>
                <td className="px-3 py-2.5 text-text-secondary">
                  {h.price != null ? `$${h.price.toFixed(2)}` : "—"}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => deleteHolding(h.symbol)}
                    disabled={deleting === h.symbol}
                    className="text-danger-fg opacity-50 hover:opacity-100 transition-opacity text-base leading-none"
                    title="Remove holding"
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Weight helpers ───────────────────────────────────────────────────────────

function calcSuggestedWeight(currentTotal: number, holdingsCount: number): number {
  const remaining = parseFloat((100 - currentTotal).toFixed(1));
  if (remaining > 0.5) return remaining;
  return parseFloat((100 / (holdingsCount + 1)).toFixed(1));
}

async function applyHoldingAdd(
  portfolioId: string,
  symbol: string,
  weight: number,
  assetType: string,
  currentHoldings: Holding[],
  currentTotal: number,
): Promise<void> {
  const requests: Promise<Response>[] = [];
  if (currentTotal + weight > 100.05 && currentTotal > 0) {
    const targetExisting = 100 - weight;
    for (const h of currentHoldings) {
      const newW = parseFloat(((h.weight / currentTotal) * targetExisting).toFixed(2));
      if (newW > 0) {
        requests.push(
          fetch(`/api/user/portfolios/${portfolioId}/holdings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol: h.symbol, weight: newW, assetType: h.assetType }),
          })
        );
      }
    }
  }
  requests.push(
    fetch(`/api/user/portfolios/${portfolioId}/holdings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, weight, assetType }),
    })
  );
  await Promise.all(requests);
}

// ─── Weight Prompt Panel ──────────────────────────────────────────────────────

function WeightPromptPanel({
  symbol,
  name,
  assetType,
  initialWeight,
  currentTotal,
  onConfirm,
  onCancel,
  adding,
  error,
}: {
  symbol: string;
  name: string;
  assetType: "STOCK" | "ETF";
  initialWeight: number;
  currentTotal: number;
  onConfirm: (weight: number) => void;
  onCancel: () => void;
  adding: boolean;
  error: string;
}) {
  const [rawWeight, setRawWeight] = useState(initialWeight.toFixed(1));
  const w = Math.max(0, parseFloat(rawWeight) || 0);
  const newTotal = parseFloat((currentTotal + w).toFixed(1));
  const willExceed = newTotal > 100.05;

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); if (w > 0) onConfirm(w); }
    if (e.key === "Escape") { e.preventDefault(); onCancel(); }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-3 space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-text-primary">{symbol}</span>
        <Badge variant={assetType === "ETF" ? "info" : "default"} className="text-[10px] px-1">
          {assetType}
        </Badge>
        <span className="text-xs text-text-tertiary truncate">{name}</span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-text-secondary whitespace-nowrap">Allocation weight</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0.1"
            max="100"
            step="0.1"
            value={rawWeight}
            onChange={(e) => setRawWeight(e.target.value)}
            onKeyDown={handleKey}
            autoFocus
            className="w-20 rounded-lg border border-input-border bg-input-bg px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-fg"
          />
          <span className="text-xs text-text-secondary">%</span>
        </div>
        <span className="text-xs text-text-tertiary">
          New total:{" "}
          <span className={
            willExceed ? "font-medium text-warning-fg"
            : newTotal >= 99.5 ? "font-medium text-success-fg"
            : "text-text-secondary"
          }>
            {newTotal}%
          </span>
        </span>
      </div>
      {willExceed && (
        <p className="text-xs text-warning-fg">
          Exceeds 100% — existing holdings will be scaled down proportionally to fit.
        </p>
      )}
      {error && <p className="text-xs text-danger-fg">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onConfirm(w)} disabled={adding || w <= 0}>
          {adding ? "Adding…" : "Add to portfolio"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={adding}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Symbol Search ────────────────────────────────────────────────────────────

function SymbolSearch({
  portfolioId,
  existingSymbols,
  currentHoldings,
  totalWeight,
  onAdded,
}: {
  portfolioId: string;
  existingSymbols: string[];
  currentHoldings: Holding[];
  totalWeight: number;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [pendingAdd, setPendingAdd] = useState<SearchResult | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/securities/search?q=${encodeURIComponent(query)}&limit=8`);
        const data = await res.json() as { results: SearchResult[] };
        setResults(data.results ?? []);
        setOpen(true);
        setActiveIdx(0);
      } catch { /* silent */ }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectResult(result: SearchResult) {
    if (existingSymbols.includes(result.symbol)) return;
    setOpen(false);
    setPendingAdd(result);
    setError("");
  }

  async function confirmAdd(weight: number) {
    if (!pendingAdd || weight <= 0) return;
    setAdding(true);
    setError("");
    try {
      await applyHoldingAdd(portfolioId, pendingAdd.symbol, weight, pendingAdd.assetType, currentHoldings, totalWeight);
      setQuery("");
      setPendingAdd(null);
      onAdded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error adding holding");
    } finally {
      setAdding(false);
    }
  }

  function cancelAdd() {
    setPendingAdd(null);
    setError("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); if (results[activeIdx]) selectResult(results[activeIdx]); }
    if (e.key === "Escape") {
      if (pendingAdd) cancelAdd();
      else { setOpen(false); inputRef.current?.blur(); }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (pendingAdd) setPendingAdd(null); }}
            onFocus={() => results.length > 0 && !pendingAdd && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search symbol or company name…"
            className="w-full rounded-xl border border-input-border bg-input-bg px-3 py-2 pr-8 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-fg"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setOpen(false); setPendingAdd(null); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {pendingAdd ? (
        <div className="mt-2">
          <WeightPromptPanel
            symbol={pendingAdd.symbol}
            name={pendingAdd.name}
            assetType={pendingAdd.assetType}
            initialWeight={calcSuggestedWeight(totalWeight, existingSymbols.length)}
            currentTotal={totalWeight}
            onConfirm={confirmAdd}
            onCancel={cancelAdd}
            adding={adding}
            error={error}
          />
        </div>
      ) : (
        <>
          {error && <p className="mt-1 text-xs text-danger-fg">{error}</p>}
          {open && results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-xl">
              {results.map((r, i) => {
                const alreadyIn = existingSymbols.includes(r.symbol);
                const isActive = i === activeIdx;
                return (
                  <button
                    key={r.symbol}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors
                      ${isActive ? "bg-surface" : "hover:bg-surface"}
                      ${alreadyIn ? "opacity-50 cursor-default" : "cursor-pointer"}`}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => !alreadyIn && selectResult(r)}
                    disabled={alreadyIn}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">{r.symbol}</span>
                        <Badge variant={r.assetType === "ETF" ? "info" : "default"} className="text-[10px] px-1">
                          {r.assetType}
                        </Badge>
                        {alreadyIn && (
                          <span className="text-[10px] text-text-tertiary">Already added</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-text-tertiary truncate">{r.name}</span>
                        {r.sector && <span className="text-[10px] text-text-tertiary">· {r.sector}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      {r.upside != null && (
                        <span className={`text-xs font-medium ${r.upside >= 10 ? "text-success-fg" : r.upside >= 0 ? "text-warning-fg" : "text-danger-fg"}`}>
                          +{r.upside.toFixed(1)}%
                        </span>
                      )}
                      {r.risk && <RiskBadge risk={r.risk} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Weight Manager ───────────────────────────────────────────────────────────

function WeightManager({
  portfolioId,
  holdings,
  holdingsData,
  totalWeight,
  onWeightsUpdated,
}: {
  portfolioId: string;
  holdings: Holding[];
  holdingsData: HoldingData[];
  totalWeight: number;
  onWeightsUpdated: () => void;
}) {
  const [applying, setApplying] = useState(false);
  const weightOk = Math.abs(totalWeight - 100) < 0.1;
  const weightColor = totalWeight > 100.5
    ? "text-warning-fg"
    : weightOk
      ? "text-success-fg"
      : "text-text-tertiary";

  async function applyWeights(weights: { symbol: string; weight: number; assetType: string }[]) {
    setApplying(true);
    try {
      await Promise.all(
        weights.map((w) =>
          fetch(`/api/user/portfolios/${portfolioId}/holdings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(w),
          })
        )
      );
      onWeightsUpdated();
    } finally {
      setApplying(false);
    }
  }

  async function equalWeight() {
    if (holdings.length === 0) return;
    const base = parseFloat((100 / holdings.length).toFixed(2));
    const last = parseFloat((100 - base * (holdings.length - 1)).toFixed(2));
    await applyWeights(
      holdings.map((h, i) => ({
        symbol: h.symbol,
        weight: i === holdings.length - 1 ? last : base,
        assetType: h.assetType,
      }))
    );
  }

  async function upsideWeighted() {
    const stockHoldings = holdingsData.filter((h) => h.assetType === "STOCK" && (h.upside ?? 0) > 0);
    if (stockHoldings.length === 0) { await equalWeight(); return; }
    const totalUpside = stockHoldings.reduce((s, h) => s + (h.upside ?? 0), 0);
    const weights = holdings.map((h) => {
      const hd = holdingsData.find((d) => d.symbol === h.symbol);
      const upside = hd?.assetType === "STOCK" ? Math.max(hd.upside ?? 0, 0) : 0;
      return {
        symbol: h.symbol,
        weight: parseFloat(((upside / totalUpside) * 100).toFixed(2)),
        assetType: h.assetType,
      };
    });
    // Adjust last to ensure exact 100
    const sumW = weights.reduce((s, w) => s + w.weight, 0);
    weights[weights.length - 1].weight = parseFloat(
      (weights[weights.length - 1].weight + (100 - sumW)).toFixed(2)
    );
    await applyWeights(weights);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`text-sm font-medium ${weightColor}`}>
        {totalWeight.toFixed(1)}% allocated
      </span>
      {holdings.length >= 2 && (
        <>
          <Button size="sm" variant="secondary" onClick={equalWeight} disabled={applying}>
            Equal weight
          </Button>
          <Button size="sm" variant="secondary" onClick={upsideWeighted} disabled={applying}>
            Upside-weighted
          </Button>
        </>
      )}
    </div>
  );
}

// ─── Portfolio Selector ───────────────────────────────────────────────────────

function PortfolioSelector({
  portfolios,
  activeId,
  onSelect,
  onCreated,
  onDeleted,
  onRenamed,
}: {
  portfolios: Portfolio[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreated: (p: Portfolio) => void;
  onDeleted: (id: string) => void;
  onRenamed: (id: string, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function createPortfolio(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/user/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const p = await res.json() as Portfolio;
      onCreated(p);
      setName("");
    } catch {
      setCreateError("Could not create portfolio.");
    } finally {
      setCreating(false);
    }
  }

  async function renamePortfolio(id: string) {
    if (!renameName.trim()) { setRenamingId(null); return; }
    await fetch(`/api/user/portfolios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameName.trim() }),
    });
    onRenamed(id, renameName.trim());
    setRenamingId(null);
  }

  async function deletePortfolio(id: string, pName: string) {
    if (!confirm(`Delete "${pName}"? This cannot be undone.`)) return;
    setDeletingId(id);
    await fetch(`/api/user/portfolios/${id}`, { method: "DELETE" });
    onDeleted(id);
    setDeletingId(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {portfolios.map((p) => (
        <div
          key={p.id}
          className={`group rounded-xl border px-3 py-2.5 cursor-pointer transition-all
            ${activeId === p.id
              ? "border-accent-fg bg-surface-elevated"
              : "border-border bg-surface hover:border-border hover:bg-surface-elevated/60"
            }`}
          onClick={() => onSelect(p.id)}
        >
          {renamingId === p.id ? (
            <form
              onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); renamePortfolio(p.id); }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                className="w-full rounded border border-accent-fg bg-input-bg px-2 py-0.5 text-sm text-text-primary focus:outline-none"
                onKeyDown={(e) => { if (e.key === "Escape") setRenamingId(null); }}
                onBlur={() => renamePortfolio(p.id)}
              />
            </form>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-text-primary truncate">{p.name}</span>
              <div
                className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { setRenamingId(p.id); setRenameName(p.name); }}
                  className="text-[11px] text-link-fg hover:text-accent-fg"
                >
                  Rename
                </button>
                <button
                  onClick={() => deletePortfolio(p.id, p.name)}
                  disabled={deletingId === p.id}
                  className="text-[11px] text-danger-fg opacity-60 hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
          <p className="mt-0.5 text-[11px] text-text-tertiary">
            {p.holdings.length} holding{p.holdings.length !== 1 ? "s" : ""}
          </p>
        </div>
      ))}

      {portfolios.length < 10 && (
        <form onSubmit={createPortfolio} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New portfolio name"
            maxLength={100}
            className="flex-1 min-w-0 rounded-xl border border-input-border bg-input-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-fg"
          />
          <Button type="submit" size="sm" disabled={creating || !name.trim()}>
            {creating ? "…" : "Create"}
          </Button>
        </form>
      )}
      {createError && <p className="text-xs text-danger-fg">{createError}</p>}
    </div>
  );
}

// ─── Securities Browser ──────────────────────────────────────────────────────

interface StockRow {
  symbol: string;
  name: string;
  assetType: "STOCK" | "ETF";
  sector: string;
  upside: number | null;
  risk: string | null;
  price: number | null;
  analysts: number | null;
  region?: string;
}

function SecuritiesBrowser({
  portfolioId,
  existingSymbols,
  currentHoldings,
  totalWeight,
  onAdded,
}: {
  portfolioId: string;
  existingSymbols: string[];
  currentHoldings: Holding[];
  totalWeight: number;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [securities, setSecurities] = useState<StockRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "STOCK" | "ETF">("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<"symbol" | "upside" | "name">("upside");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pendingAdd, setPendingAdd] = useState<StockRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  async function load() {
    if (loaded) return;
    setLoading(true);
    try {
      const [stockRes, etfRes] = await Promise.all([
        fetch("/api/stocks"),
        fetch("/api/etfs"),
      ]);
      const stockData = await stockRes.json() as {
        stocks: Array<{ symbol: string; name: string; sector: string; upside: number; risk: string; price: number; analysts: number; region: string }>;
      };
      const etfData = await etfRes.json() as Array<{ symbol: string; name: string; theme: string; cagr1y: number; region: string }>;
      const rows: StockRow[] = [
        ...(stockData.stocks ?? []).map((s) => ({
          symbol: s.symbol,
          name: s.name,
          assetType: "STOCK" as const,
          sector: s.sector,
          upside: s.upside,
          risk: s.risk?.toUpperCase() ?? null,   // API returns lowercase ("low"), normalize to "LOW"
          price: s.price,
          analysts: s.analysts,
          region: s.region,
        })),
        ...etfData.map((e) => ({
          symbol: e.symbol,
          name: e.name,
          assetType: "ETF" as const,
          sector: e.theme,
          upside: e.cagr1y ?? null,
          risk: null,
          price: null,
          analysts: null,
          region: e.region,
        })),
      ];
      setSecurities(rows);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setOpen((prev) => {
      if (!prev) load();
      return !prev;
    });
  }

  function startAdd(row: StockRow) {
    if (existingSymbols.includes(row.symbol)) return;
    setPendingAdd(row);
    setAddError("");
  }

  async function confirmAdd(weight: number) {
    if (!pendingAdd || weight <= 0) return;
    setAdding(true);
    setAddError("");
    try {
      await applyHoldingAdd(portfolioId, pendingAdd.symbol, weight, pendingAdd.assetType, currentHoldings, totalWeight);
      setPendingAdd(null);
      onAdded();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Error adding holding");
    } finally {
      setAdding(false);
    }
  }

  function cancelAdd() {
    setPendingAdd(null);
    setAddError("");
  }

  const sectors = [...new Set(securities.filter((s) => s.assetType === "STOCK").map((s) => s.sector))].sort();

  const filtered = securities
    .filter((s) => {
      if (typeFilter !== "ALL" && s.assetType !== typeFilter) return false;
      if (riskFilter !== "ALL" && s.risk !== riskFilter) return false;
      if (filter) {
        const q = filter.toLowerCase();
        return s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector?.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortKey === "symbol") return sortDir === "asc" ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
      if (sortKey === "name") return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      // upside
      const av = a.upside ?? -999;
      const bv = b.upside ?? -999;
      return sortDir === "asc" ? av - bv : bv - av;
    });

  function toggleSort(k: typeof sortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  }

  return (
    <div className="border-t border-border pt-4 mt-2">
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 text-sm text-link-fg hover:text-accent-fg transition-colors"
      >
        <span>{open ? "▾" : "▸"}</span>
        Browse all {loaded ? `(${securities.length})` : "securities"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Weight prompt panel */}
          {pendingAdd && (
            <WeightPromptPanel
              symbol={pendingAdd.symbol}
              name={pendingAdd.name}
              assetType={pendingAdd.assetType}
              initialWeight={calcSuggestedWeight(totalWeight, existingSymbols.length)}
              currentTotal={totalWeight}
              onConfirm={confirmAdd}
              onCancel={cancelAdd}
              adding={adding}
              error={addError}
            />
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by symbol, name, sector…"
              className="flex-1 min-w-[160px] rounded-xl border border-input-border bg-input-bg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-fg"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "ALL" | "STOCK" | "ETF")}
              className="rounded-xl border border-input-border bg-input-bg px-2 py-1.5 text-sm text-text-primary focus:outline-none"
            >
              <option value="ALL" className="bg-surface-elevated">All types</option>
              <option value="STOCK" className="bg-surface-elevated">Stocks only</option>
              <option value="ETF" className="bg-surface-elevated">ETFs only</option>
            </select>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="rounded-xl border border-input-border bg-input-bg px-2 py-1.5 text-sm text-text-primary focus:outline-none"
            >
              <option value="ALL" className="bg-surface-elevated">All risk</option>
              <option value="LOW" className="bg-surface-elevated">Low</option>
              <option value="BALANCED" className="bg-surface-elevated">Balanced</option>
              <option value="HIGH" className="bg-surface-elevated">High</option>
            </select>
          </div>

          {/* Results count */}
          {loaded && (
            <p className="text-xs text-text-tertiary">
              {filtered.length} of {securities.length} securities
              {filter || typeFilter !== "ALL" || riskFilter !== "ALL" ? " (filtered)" : ""}
            </p>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex h-20 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent-fg" />
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface border-b border-border">
                  <tr>
                    {[
                      { label: "Symbol", k: "symbol" as const },
                      { label: "Name", k: "name" as const },
                      { label: "Sector", k: null },
                      { label: "Risk", k: null },
                      { label: "Upside", k: "upside" as const },
                      { label: "", k: null },
                    ].map(({ label, k }, i) => (
                      <th
                        key={i}
                        className={`px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wide text-text-tertiary whitespace-nowrap ${k ? "cursor-pointer hover:text-text-secondary" : ""}`}
                        onClick={() => k && toggleSort(k)}
                      >
                        {label}
                        {k && sortKey === k && (
                          <span className="ml-1 text-accent-fg">{sortDir === "asc" ? "↑" : "↓"}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 200).map((row) => {
                    const alreadyIn = existingSymbols.includes(row.symbol);
                    const isPending = pendingAdd?.symbol === row.symbol;
                    const isAdding = isPending && adding;
                    const upsideColor = row.upside == null ? "text-text-tertiary"
                      : row.upside >= 20 ? "text-success-fg"
                      : row.upside >= 5 ? "text-warning-fg"
                      : "text-danger-fg";
                    return (
                      <tr key={row.symbol}
                        className={`border-b border-border last:border-0 transition-colors ${alreadyIn ? "opacity-50" : "hover:bg-surface/60"}`}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-text-primary">{row.symbol}</span>
                            <Badge variant={row.assetType === "ETF" ? "info" : "default"} className="text-[10px] px-1">{row.assetType}</Badge>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-text-secondary max-w-[150px] truncate text-xs" title={row.name}>{row.name}</td>
                        <td className="px-3 py-2 text-text-tertiary text-xs whitespace-nowrap">{row.sector || "—"}</td>
                        <td className="px-3 py-2"><RiskBadge risk={row.risk} /></td>
                        <td className={`px-3 py-2 font-medium text-xs ${upsideColor}`}>
                          {row.upside != null ? `+${row.upside.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {alreadyIn ? (
                            <span className="text-[10px] text-text-tertiary">Added</span>
                          ) : isPending ? (
                            <span className="text-[10px] text-accent-fg font-medium">
                              {isAdding ? "Adding…" : "Selected ↑"}
                            </span>
                          ) : (
                            <button
                              onClick={() => startAdd(row)}
                              disabled={!!pendingAdd}
                              className="rounded-lg border border-accent-fg px-2 py-0.5 text-xs text-accent-fg hover:bg-accent-fg hover:text-white transition-colors disabled:opacity-50"
                            >
                              + Add
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-text-tertiary">
                        No securities match your filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Portfolio Manager ───────────────────────────────────────────────────

const RANGES = ["1w", "1m", "3m", "6m", "1y"] as const;
type Range = typeof RANGES[number];

export function PortfolioManager() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("3m");
  const [perfData, setPerfData] = useState<PerfData | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);

  const active = portfolios.find((p) => p.id === activeId) ?? null;

  const fetchPortfolios = useCallback(async () => {
    try {
      const res = await fetch("/api/user/portfolios");
      if (res.ok) {
        const data = await res.json() as Portfolio[];
        setPortfolios(Array.isArray(data) ? data : []);
        setActiveId((prev) => {
          if (prev && data.find((p) => p.id === prev)) return prev;
          return data[0]?.id ?? null;
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPortfolios(); }, [fetchPortfolios]);

  const fetchPerf = useCallback(async (id: string, r: Range) => {
    setPerfLoading(true);
    setPerfData(null);
    try {
      const res = await fetch(`/api/user/portfolios/${id}/performance?range=${r}`);
      if (res.ok) {
        const data = await res.json() as PerfData;
        setPerfData(data);
      }
    } finally {
      setPerfLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeId) fetchPerf(activeId, range);
  }, [activeId, range, fetchPerf]);

  function handleHoldingChanged() {
    fetchPortfolios();
    if (activeId) fetchPerf(activeId, range);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent-fg" />
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <Card variant="glass" className="p-6">
          <p className="mb-3 text-sm font-medium text-text-primary">Create your first portfolio</p>
          <PortfolioSelector
            portfolios={[]}
            activeId={null}
            onSelect={() => {}}
            onCreated={(p) => { setPortfolios([p]); setActiveId(p.id); }}
            onDeleted={() => {}}
            onRenamed={() => {}}
          />
        </Card>
        <Card variant="glass" className="py-12 text-center">
          <p className="text-text-secondary">No portfolios yet.</p>
          <p className="mt-2 text-sm text-text-tertiary">
            Or{" "}
            <Link href="/demo-portfolios" className="text-link-fg hover:text-accent-fg">
              explore the demo portfolios
            </Link>{" "}
            to see what&apos;s possible.
          </p>
        </Card>
      </div>
    );
  }

  const hasChart = !perfLoading && (perfData?.portfolioValues?.length ?? 0) >= 2;
  const holdings = perfData?.holdingsData ?? active?.holdings.map((h) => ({
    symbol: h.symbol,
    name: h.symbol,
    assetType: h.assetType,
    weight: h.weight,
    sector: "",
    region: "",
    risk: null,
    upside: null,
    buys: null,
    holds: null,
    sells: null,
    price: null,
    dividendYield: null,
    beta: null,
    pe: null,
  })) ?? [];
  const totalWeight = active?.holdings.reduce((s, h) => s + h.weight, 0) ?? 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      {/* Sidebar — portfolio list */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card variant="glass">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
            My Portfolios
          </p>
          <PortfolioSelector
            portfolios={portfolios}
            activeId={activeId}
            onSelect={(id) => { setActiveId(id); }}
            onCreated={(p) => {
              setPortfolios((prev) => [p, ...prev]);
              setActiveId(p.id);
            }}
            onDeleted={(id) => {
              setPortfolios((prev) => prev.filter((x) => x.id !== id));
              setActiveId((prev) => {
                if (prev !== id) return prev;
                return portfolios.find((p) => p.id !== id)?.id ?? null;
              });
            }}
            onRenamed={(id, name) =>
              setPortfolios((prev) =>
                prev.map((x) => (x.id === id ? { ...x, name } : x))
              )
            }
          />
          {portfolios.length >= 10 && (
            <p className="mt-2 text-center text-xs text-text-tertiary">
              Maximum 10 portfolios reached
            </p>
          )}
        </Card>
      </div>

      {/* Main content area */}
      <div className="space-y-4 min-w-0">
        {active && (
          <>
            {/* Performance chart card */}
            <Card variant="glass">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">{active.name}</h2>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {active.holdings.length} holding{active.holdings.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                  {RANGES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        range === r
                          ? "bg-accent-fg text-white"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {perfLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent-fg" />
                </div>
              ) : hasChart ? (
                <>
                  <PerformanceChart
                    dates={perfData!.dates}
                    values={perfData!.portfolioValues}
                  />
                  {perfData?.summary && (
                    <div className="mt-4">
                      <AnalyticsSummary summary={perfData.summary} range={range.toUpperCase()} />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-40 items-center justify-center">
                  <div className="text-center">
                    <p className="text-text-secondary text-sm">No chart data available</p>
                    <p className="mt-1 text-xs text-text-tertiary">
                      Add at least 2 stock holdings with historical data
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Holdings table card */}
            <Card variant="glass">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-text-primary">Holdings</h3>
                <WeightManager
                  portfolioId={active.id}
                  holdings={active.holdings}
                  holdingsData={holdings}
                  totalWeight={totalWeight}
                  onWeightsUpdated={handleHoldingChanged}
                />
              </div>

              {holdings.length > 0 ? (
                <HoldingsTable
                  holdings={holdings}
                  portfolioId={active.id}
                  onWeightSaved={handleHoldingChanged}
                  onDeleted={() => handleHoldingChanged()}
                />
              ) : (
                <p className="py-6 text-center text-sm text-text-tertiary">
                  No holdings yet. Search for a stock or ETF below to add one.
                </p>
              )}

              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-xs text-text-tertiary">
                  Search by symbol or company name to add (max 20 holdings)
                </p>
                <SymbolSearch
                  portfolioId={active.id}
                  existingSymbols={active.holdings.map((h) => h.symbol)}
                  currentHoldings={active.holdings}
                  totalWeight={totalWeight}
                  onAdded={handleHoldingChanged}
                />
                <SecuritiesBrowser
                  portfolioId={active.id}
                  existingSymbols={active.holdings.map((h) => h.symbol)}
                  currentHoldings={active.holdings}
                  totalWeight={totalWeight}
                  onAdded={handleHoldingChanged}
                />
              </div>
            </Card>

            {/* Allocation breakdown */}
            {perfData?.breakdown && (
              <Card variant="glass">
                <h3 className="mb-4 text-sm font-semibold text-text-primary">Allocation Breakdown</h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {Object.keys(perfData.breakdown.sector).length > 0 && (
                    <DonutChart data={perfData.breakdown.sector} label="Sector" />
                  )}
                  {Object.keys(perfData.breakdown.region).length > 0 && (
                    <DonutChart data={perfData.breakdown.region} label="Region" />
                  )}
                  {Object.keys(perfData.breakdown.risk).length > 0 && (
                    <DonutChart data={perfData.breakdown.risk} label="Risk Level" />
                  )}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
