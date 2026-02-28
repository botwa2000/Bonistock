"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { UpgradePaywall } from "@/components/features/upgrade-paywall";

interface Alert {
  id: string;
  symbol: string;
  type: "PRICE_TARGET" | "RATING_CHANGE" | "TREND_WARNING";
  condition: { operator?: string; value?: number };
  message: string | null;
  triggered: boolean;
  triggeredAt: string | null;
  createdAt: string;
}

export default function AlertsPage() {
  const t = useTranslations("alerts");
  const { user } = useAuth();
  const tier = user?.tier ?? "free";
  const passWindowActive = user?.passWindowActive ?? false;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [symbol, setSymbol] = useState("");
  const [type, setType] = useState<"PRICE_TARGET" | "RATING_CHANGE" | "TREND_WARNING">("PRICE_TARGET");
  const [operator, setOperator] = useState("gte");
  const [priceValue, setPriceValue] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = tier === "free" || (tier === "pass" && !passWindowActive);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/user/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!blocked && user) {
      fetchAlerts();
    } else {
      setLoading(false);
    }
  }, [blocked, user, fetchAlerts]);

  const handleCreate = async () => {
    if (!symbol.trim()) {
      setError("Symbol is required");
      return;
    }

    const condition: Record<string, unknown> = {};
    if (type === "PRICE_TARGET") {
      const val = parseFloat(priceValue);
      if (isNaN(val) || val <= 0) {
        setError("Enter a valid price");
        return;
      }
      condition.operator = operator;
      condition.value = val;
    } else if (type === "RATING_CHANGE") {
      condition.ratingChange = true;
    } else {
      condition.trendWarning = true;
    }

    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/user/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.toUpperCase().trim(),
          type,
          condition,
          message: message.trim() || undefined,
        }),
      });
      if (res.ok) {
        setSymbol("");
        setPriceValue("");
        setMessage("");
        await fetchAlerts();
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to create alert");
      }
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/user/alerts?id=${id}`, { method: "DELETE" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (blocked) {
    return (
      <div className="space-y-6">
        <SectionHeader title={t("title")} subtitle={t("subtitle")} />
        <UpgradePaywall feature={t("title")} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-accent-fg" />
      </div>
    );
  }

  const formatCondition = (alert: Alert): string => {
    if (alert.type === "PRICE_TARGET") {
      const op = alert.condition.operator === "gte" ? "\u2265" : "\u2264";
      return `Price ${op} $${alert.condition.value}`;
    }
    if (alert.type === "RATING_CHANGE") return "Rating Change";
    return "Trend Warning";
  };

  const typeLabel = (t: string) => {
    if (t === "PRICE_TARGET") return "Price Target";
    if (t === "RATING_CHANGE") return "Rating Change";
    return "Trend Warning";
  };

  return (
    <div className="space-y-6">
      <SectionHeader title={t("title")} subtitle={t("subtitle")} />

      {/* Create Alert Form */}
      <Card variant="glass" padding="lg">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Create Alert</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-28">
            <label className="block text-xs text-text-tertiary mb-1">Symbol</label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="AAPL"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs text-text-tertiary mb-1">Type</label>
            <Select
              id="alert-type"
              value={type}
              onChange={(v) => setType(v as typeof type)}
              options={[
                { value: "PRICE_TARGET", label: "Price Target" },
                { value: "RATING_CHANGE", label: "Rating Change" },
                { value: "TREND_WARNING", label: "Trend Warning" },
              ]}
            />
          </div>
          {type === "PRICE_TARGET" && (
            <>
              <div className="w-20">
                <label className="block text-xs text-text-tertiary mb-1">When</label>
                <Select
                  id="alert-operator"
                  value={operator}
                  onChange={setOperator}
                  options={[
                    { value: "gte", label: "\u2265" },
                    { value: "lte", label: "\u2264" },
                  ]}
                />
              </div>
              <div className="w-28">
                <label className="block text-xs text-text-tertiary mb-1">Price ($)</label>
                <Input
                  type="number"
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                  placeholder="150.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </>
          )}
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs text-text-tertiary mb-1">Message (optional)</label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Custom alert message"
            />
          </div>
          <Button onClick={handleCreate} disabled={creating} size="sm">
            {creating ? "..." : "Create Alert"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-danger-fg">{error}</p>}
      </Card>

      {/* Alert List */}
      {alerts.length === 0 ? (
        <Card variant="glass" className="py-12 text-center">
          <p className="text-text-secondary">No alerts yet. Create your first alert above.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Table header — desktop */}
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 text-[11px] uppercase text-text-tertiary font-medium">
            <span className="w-20">Symbol</span>
            <span className="w-28">Type</span>
            <span className="flex-1">Condition</span>
            <span className="w-20 text-center">Status</span>
            <span className="w-28">Created</span>
            <span className="w-16" />
          </div>

          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex flex-wrap md:flex-nowrap items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
            >
              <span className="w-20 font-semibold text-text-primary">{alert.symbol}</span>
              <span className="w-28 text-text-secondary text-xs">{typeLabel(alert.type)}</span>
              <span className="flex-1 text-text-secondary text-xs">{formatCondition(alert)}</span>
              <span className="w-20 text-center">
                {alert.triggered ? (
                  <Badge variant="warning">Triggered</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </span>
              <span className="w-28 text-xs text-text-tertiary">
                {new Date(alert.createdAt).toLocaleDateString()}
                {alert.triggeredAt && (
                  <div className="text-[10px] text-warning-fg">
                    Fired {new Date(alert.triggeredAt).toLocaleDateString()}
                  </div>
                )}
              </span>
              <span className="w-16 text-right">
                <Button variant="ghost" size="sm" onClick={() => handleDelete(alert.id)}>
                  Delete
                </Button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
