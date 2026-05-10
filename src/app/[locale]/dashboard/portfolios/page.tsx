"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { UpgradePaywall } from "@/components/features/upgrade-paywall";

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

function NewPortfolioForm({ onCreated }: { onCreated: (p: Portfolio) => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const portfolio = await res.json() as Portfolio;
      onCreated(portfolio);
      setName("");
    } catch {
      setError("Could not create portfolio. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Portfolio name"
        maxLength={100}
        className="flex-1 rounded-xl border border-input-border bg-input-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-fg"
      />
      <Button type="submit" size="sm" disabled={saving || !name.trim()}>
        {saving ? "Creating…" : "Create"}
      </Button>
      {error && <p className="text-xs text-danger-fg">{error}</p>}
    </form>
  );
}

function AddHoldingForm({
  portfolioId,
  onAdded,
}: {
  portfolioId: string;
  onAdded: () => void;
}) {
  const [symbol, setSymbol] = useState("");
  const [weight, setWeight] = useState("");
  const [assetType, setAssetType] = useState<"STOCK" | "ETF">("STOCK");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weight);
    if (!symbol.trim() || isNaN(w) || w <= 0 || w > 100) {
      setError("Enter a valid symbol and weight (0–100).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/user/portfolios/${portfolioId}/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: symbol.trim().toUpperCase(), weight: w, assetType }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Failed");
      }
      setSymbol("");
      setWeight("");
      onAdded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error adding holding");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <input
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        placeholder="Symbol (e.g. AAPL)"
        maxLength={20}
        className="w-32 rounded-xl border border-input-border bg-input-bg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-fg"
      />
      <input
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        placeholder="Weight %"
        type="number"
        min="0.01"
        max="100"
        step="0.01"
        className="w-24 rounded-xl border border-input-border bg-input-bg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-fg"
      />
      <select
        value={assetType}
        onChange={(e) => setAssetType(e.target.value as "STOCK" | "ETF")}
        className="rounded-xl border border-input-border bg-input-bg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-fg"
      >
        <option value="STOCK" className="bg-surface-elevated text-text-primary">Stock</option>
        <option value="ETF" className="bg-surface-elevated text-text-primary">ETF</option>
      </select>
      <Button type="submit" size="sm" disabled={saving}>
        {saving ? "Adding…" : "Add"}
      </Button>
      {error && <p className="w-full text-xs text-danger-fg">{error}</p>}
    </form>
  );
}

interface PerfSummary {
  rangeReturn: number;
  weightedUpside: number;
  weightedBuyPct: number;
}

function MiniSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const W = 120;
  const H = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const toX = (i: number) => (i / (values.length - 1)) * W;
  const toY = (v: number) => H - ((v - min) / range) * H;
  const pts = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const positive = values[values.length - 1] >= values[0];
  const color = positive ? "var(--success-fg)" : "var(--danger-fg)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 60, height: 24 }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function PortfolioCard({
  portfolio,
  onDeleted,
  onHoldingChanged,
}: {
  portfolio: Portfolio;
  onDeleted: (id: string) => void;
  onHoldingChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [perf, setPerf] = useState<{ values: number[]; summary: PerfSummary } | null>(null);

  const totalWeight = portfolio.holdings.reduce((s, h) => s + h.weight, 0);

  useEffect(() => {
    const hasStocks = portfolio.holdings.some((h) => h.assetType === "STOCK");
    if (!hasStocks || portfolio.holdings.length < 2) return;
    fetch(`/api/user/portfolios/${portfolio.id}/performance?range=3m`)
      .then((r) => r.json())
      .then((data: { portfolioValues?: number[]; summary?: PerfSummary }) => {
        if (data.portfolioValues && data.summary) {
          setPerf({ values: data.portfolioValues, summary: data.summary });
        }
      })
      .catch(() => {});
  }, [portfolio.id, portfolio.holdings]);

  async function deleteHolding(symbol: string) {
    await fetch(
      `/api/user/portfolios/${portfolio.id}/holdings?symbol=${encodeURIComponent(symbol)}`,
      { method: "DELETE" }
    );
    onHoldingChanged();
  }

  async function deletePortfolio() {
    if (!confirm(`Delete "${portfolio.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/user/portfolios/${portfolio.id}`, { method: "DELETE" });
    onDeleted(portfolio.id);
  }

  return (
    <Card variant="glass">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-text-primary">{portfolio.name}</h3>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {portfolio.holdings.length} holdings ·{" "}
            <span className={totalWeight > 100.01 ? "text-warning-fg" : "text-text-tertiary"}>
              {totalWeight.toFixed(1)}% allocated
            </span>
            {perf && (
              <>
                {" "}·{" "}
                <span className={perf.summary.rangeReturn >= 0 ? "text-success-fg" : "text-danger-fg"}>
                  {perf.summary.rangeReturn >= 0 ? "+" : ""}{perf.summary.rangeReturn.toFixed(1)}% 3M
                </span>
                {" "}·{" "}
                <span className="text-text-tertiary">
                  {perf.summary.weightedUpside.toFixed(1)}% upside
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {perf && <MiniSparkline values={perf.values} />}
          <button
            onClick={() => setExpanded((x) => !x)}
            className="text-xs text-link-fg hover:text-accent-fg transition-colors"
          >
            {expanded ? "Collapse" : "Edit"}
          </button>
          <button
            onClick={deletePortfolio}
            disabled={deleting}
            className="text-xs text-danger-fg opacity-60 hover:opacity-100 transition-opacity"
          >
            Delete
          </button>
        </div>
      </div>

      {portfolio.holdings.length > 0 && (
        <div className="mt-3 space-y-1">
          {portfolio.holdings.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between rounded-lg bg-surface px-3 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">{h.symbol}</span>
                <Badge variant="default" className="text-xs">{h.assetType}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary">{h.weight.toFixed(1)}%</span>
                {expanded && (
                  <button
                    onClick={() => deleteHolding(h.symbol)}
                    className="text-xs text-danger-fg opacity-60 hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-xs text-text-tertiary">Add holding (max 20, weights should total 100%)</p>
          <AddHoldingForm portfolioId={portfolio.id} onAdded={onHoldingChanged} />
        </div>
      )}
    </Card>
  );
}

export default function PortfoliosPage() {
  const { user } = useAuth();
  const tier = user?.tier ?? "free";
  const isPaid = tier === "plus" || (tier === "pass" && !!user?.passWindowActive);

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPortfolios = useCallback(async () => {
    try {
      const res = await fetch("/api/user/portfolios");
      if (res.ok) {
        const data = await res.json() as Portfolio[];
        setPortfolios(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  if (!isPaid) {
    return (
      <UpgradePaywall feature="Model portfolios — build analyst-driven baskets, track weighted upside, and monitor how analyst consensus plays out over time" />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        overline="Paid feature"
        title="My Portfolios"
        subtitle="Weight-based model portfolios built on analyst consensus data. Up to 10 portfolios, 20 holdings each."
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent-fg" />
        </div>
      ) : (
        <>
          {portfolios.length < 10 && (
            <Card variant="glass">
              <p className="mb-3 text-sm font-medium text-text-primary">New portfolio</p>
              <NewPortfolioForm
                onCreated={(p) => setPortfolios((prev) => [p, ...prev])}
              />
            </Card>
          )}

          {portfolios.length === 0 ? (
            <Card variant="glass" className="py-12 text-center">
              <p className="text-text-secondary">No portfolios yet. Create one above.</p>
              <p className="mt-2 text-sm text-text-tertiary">
                Or{" "}
                <Link href="/demo-portfolios" className="text-link-fg hover:text-accent-fg">
                  explore the demo portfolios
                </Link>{" "}
                to see what&apos;s possible.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {portfolios.map((p) => (
                <PortfolioCard
                  key={p.id}
                  portfolio={p}
                  onDeleted={(id) => setPortfolios((prev) => prev.filter((x) => x.id !== id))}
                  onHoldingChanged={fetchPortfolios}
                />
              ))}
            </div>
          )}

          {portfolios.length >= 10 && (
            <p className="text-center text-xs text-text-tertiary">
              Maximum of 10 portfolios reached.
            </p>
          )}
        </>
      )}

      <Card variant="glass" className="text-center text-xs text-text-tertiary p-4">
        Portfolio weights should total 100%. Performance tracking coming soon.
      </Card>
    </div>
  );
}
