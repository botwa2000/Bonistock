"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────────────────────────────────────────

interface VoucherTemplate {
  discountType: "PERCENT" | "FIXED_AMOUNT" | "FREE_PASS";
  discountPct?: number;
  discountFixed?: number;
  passDays?: number;
  passType?: string;
}

interface PromoterTier {
  id: string;
  name: string;
  commissionPct: number;
  monthlyVoucherLimit: number;
  recurringCommissions: boolean;
  voucherTemplate: VoucherTemplate | null;
  _count?: { promoters: number };
}

interface Promoter {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  tierId: string | null;
  tierName: string | null;
  refCode: string;
  voucherUseCount: number;
  totalEarnings: string;
  pendingEarnings: string;
  monthlyVoucherLimit: number;
  createdAt: string;
}

interface Voucher {
  id: string;
  code: string;
  type: string;
  discountType: string;
  discountPct: number | null;
  discountFixed: number | null;
  passDays: number | null;
  maxUses: number | null;
  useCount: number;
  validUntil: string | null;
  active: boolean;
  description: string | null;
}

interface Commission {
  id: string;
  promoterId: string;
  promoterEmail: string;
  referredUserId: string;
  referredUserEmail: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  settledAt: string | null;
}

type Tab = "tiers" | "promoters" | "vouchers" | "commissions";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDollars(val: string | number): string {
  return `$${parseFloat(String(val)).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}

function templateLabel(t: VoucherTemplate | null): string {
  if (!t) return "—";
  if (t.discountType === "PERCENT") return `${t.discountPct ?? "?"}% off`;
  if (t.discountType === "FIXED_AMOUNT") return formatCents(t.discountFixed ?? 0);
  if (t.discountType === "FREE_PASS") return `${t.passDays ?? "?"}d pass`;
  return "—";
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AdminAffiliatePanel() {
  const [activeTab, setActiveTab] = useState<Tab>("tiers");

  return (
    <Card variant="glass">
      <h3 className="mb-4 text-sm font-semibold text-text-primary">Affiliate Program</h3>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 border-b border-border-subtle">
        {(["tiers", "promoters", "vouchers", "commissions"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm capitalize transition-colors ${
              activeTab === tab
                ? "border-b-2 border-accent-fg text-text-primary font-medium"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "tiers" && <TiersTab />}
      {activeTab === "promoters" && <PromotersTab />}
      {activeTab === "vouchers" && <VouchersTab />}
      {activeTab === "commissions" && <CommissionsTab />}
    </Card>
  );
}

// ── Promoter Tiers Tab ─────────────────────────────────────────────────────────

function TiersTab() {
  const [tiers, setTiers] = useState<PromoterTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create form fields
  const [name, setName] = useState("");
  const [commissionPct, setCommissionPct] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [recurringCommissions, setRecurringCommissions] = useState(true);
  const [vtDiscountType, setVtDiscountType] = useState<"PERCENT" | "FIXED_AMOUNT" | "FREE_PASS">("PERCENT");
  const [vtDiscountPct, setVtDiscountPct] = useState("");
  const [vtDiscountFixed, setVtDiscountFixed] = useState("");
  const [vtPassDays, setVtPassDays] = useState("");

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editCommissionPct, setEditCommissionPct] = useState("");
  const [editMonthlyLimit, setEditMonthlyLimit] = useState("");
  const [editRecurring, setEditRecurring] = useState(true);
  const [editVtDiscountType, setEditVtDiscountType] = useState<"PERCENT" | "FIXED_AMOUNT" | "FREE_PASS">("PERCENT");
  const [editVtDiscountPct, setEditVtDiscountPct] = useState("");
  const [editVtDiscountFixed, setEditVtDiscountFixed] = useState("");
  const [editVtPassDays, setEditVtPassDays] = useState("");

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promoter-tiers");
      if (res.ok) setTiers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTiers(); }, [fetchTiers]);

  const resetForm = () => {
    setName(""); setCommissionPct(""); setMonthlyLimit(""); setRecurringCommissions(true);
    setVtDiscountType("PERCENT"); setVtDiscountPct(""); setVtDiscountFixed(""); setVtPassDays("");
    setError(null);
  };

  function buildVoucherTemplate(
    discountType: string,
    discountPct: string,
    discountFixed: string,
    passDays: string
  ): Record<string, unknown> {
    const tpl: Record<string, unknown> = { discountType };
    if (discountType === "PERCENT" && discountPct) tpl.discountPct = parseFloat(discountPct);
    if (discountType === "FIXED_AMOUNT" && discountFixed) tpl.discountFixed = Math.round(parseFloat(discountFixed) * 100);
    if (discountType === "FREE_PASS" && passDays) tpl.passDays = parseInt(passDays, 10);
    return tpl;
  }

  const handleCreate = async () => {
    const pct = parseFloat(commissionPct);
    if (!name || isNaN(pct) || pct < 0 || pct > 100) {
      setError("Name and a valid commission % (0–100) are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/promoter-tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          commissionPct: pct,
          monthlyVoucherLimit: monthlyLimit ? parseInt(monthlyLimit, 10) : -1,
          recurringCommissions,
          voucherTemplate: buildVoucherTemplate(vtDiscountType, vtDiscountPct, vtDiscountFixed, vtPassDays),
        }),
      });
      if (res.ok) {
        resetForm();
        setShowForm(false);
        fetchTiers();
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to create tier");
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (tier: PromoterTier) => {
    setEditingId(tier.id);
    setEditName(tier.name);
    setEditCommissionPct(String(tier.commissionPct));
    setEditMonthlyLimit(tier.monthlyVoucherLimit !== -1 ? String(tier.monthlyVoucherLimit) : "");
    setEditRecurring(tier.recurringCommissions);
    const tpl = tier.voucherTemplate;
    setEditVtDiscountType((tpl?.discountType as "PERCENT" | "FIXED_AMOUNT" | "FREE_PASS") ?? "PERCENT");
    setEditVtDiscountPct(tpl?.discountPct != null ? String(tpl.discountPct) : "");
    setEditVtDiscountFixed(tpl?.discountFixed != null ? (tpl.discountFixed / 100).toFixed(2) : "");
    setEditVtPassDays(tpl?.passDays != null ? String(tpl.passDays) : "");
  };

  const handleSave = async (id: string) => {
    const pct = parseFloat(editCommissionPct);
    if (!editName || isNaN(pct)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/promoter-tiers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          commissionPct: pct,
          monthlyVoucherLimit: editMonthlyLimit ? parseInt(editMonthlyLimit, 10) : -1,
          recurringCommissions: editRecurring,
          voucherTemplate: buildVoucherTemplate(editVtDiscountType, editVtDiscountPct, editVtDiscountFixed, editVtPassDays),
        }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchTiers();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tier? Promoters assigned to it will lose their tier.")) return;
    await fetch(`/api/admin/promoter-tiers/${id}`, { method: "DELETE" });
    fetchTiers();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">{tiers.length} tier(s) configured</p>
        <Button variant="primary" size="sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? "Cancel" : "New Tier"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-surface-elevated p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Tier Name</label>
              <input
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Commission %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                placeholder="20"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Monthly Voucher Limit (-1 = unlimited)</label>
              <input
                type="number"
                min="-1"
                step="1"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                placeholder="-1"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                id="recurring"
                type="checkbox"
                checked={recurringCommissions}
                onChange={(e) => setRecurringCommissions(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="recurring" className="text-xs text-text-secondary">Recurring commissions</label>
            </div>
          </div>
          <div className="border-t border-border-subtle pt-3">
            <p className="text-xs font-medium text-text-secondary mb-2">Voucher Template</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Discount Type</label>
                <select
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                  value={vtDiscountType}
                  onChange={(e) => setVtDiscountType(e.target.value as typeof vtDiscountType)}
                >
                  <option value="PERCENT" className="bg-surface-elevated text-text-primary">Percent</option>
                  <option value="FIXED_AMOUNT" className="bg-surface-elevated text-text-primary">Fixed Amount</option>
                  <option value="FREE_PASS" className="bg-surface-elevated text-text-primary">Free Pass</option>
                </select>
              </div>
              {vtDiscountType === "PERCENT" && (
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Discount %</label>
                  <input
                    type="number" min="0" max="100" step="1"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                    value={vtDiscountPct}
                    onChange={(e) => setVtDiscountPct(e.target.value)}
                    placeholder="25"
                  />
                </div>
              )}
              {vtDiscountType === "FIXED_AMOUNT" && (
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Fixed Amount ($)</label>
                  <input
                    type="number" min="0" step="0.01"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                    value={vtDiscountFixed}
                    onChange={(e) => setVtDiscountFixed(e.target.value)}
                    placeholder="5.00"
                  />
                </div>
              )}
              {vtDiscountType === "FREE_PASS" && (
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Pass Days</label>
                  <input
                    type="number" min="1"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                    value={vtPassDays}
                    onChange={(e) => setVtPassDays(e.target.value)}
                    placeholder="3"
                  />
                </div>
              )}
            </div>
          </div>
          {error && <p className="text-xs text-danger-fg">{error}</p>}
          <Button variant="primary" size="sm" disabled={saving} onClick={handleCreate}>
            {saving ? "Creating..." : "Create Tier"}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-tertiary border-t-accent-fg" />
        </div>
      ) : tiers.length === 0 ? (
        <p className="text-sm text-text-tertiary">No tiers yet.</p>
      ) : (
        <div className="space-y-3">
          {tiers.map((tier) =>
            editingId === tier.id ? (
              <div key={tier.id} className="rounded-lg border border-border bg-surface-elevated p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Tier Name</label>
                    <input
                      className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Commission %</label>
                    <input
                      type="number" min="0" max="100" step="0.1"
                      className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
                      value={editCommissionPct}
                      onChange={(e) => setEditCommissionPct(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Monthly Voucher Limit (-1 = unlimited)</label>
                    <input
                      type="number" min="-1" step="1"
                      className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
                      value={editMonthlyLimit}
                      onChange={(e) => setEditMonthlyLimit(e.target.value)}
                      placeholder="-1"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <input
                      id={`recurring-${tier.id}`}
                      type="checkbox"
                      checked={editRecurring}
                      onChange={(e) => setEditRecurring(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor={`recurring-${tier.id}`} className="text-xs text-text-secondary">Recurring commissions</label>
                  </div>
                </div>
                <div className="border-t border-border-subtle pt-3">
                  <p className="text-xs font-medium text-text-secondary mb-2">Voucher Template</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Discount Type</label>
                      <select
                        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
                        value={editVtDiscountType}
                        onChange={(e) => setEditVtDiscountType(e.target.value as typeof editVtDiscountType)}
                      >
                        <option value="PERCENT" className="bg-surface-elevated text-text-primary">Percent</option>
                        <option value="FIXED_AMOUNT" className="bg-surface-elevated text-text-primary">Fixed Amount</option>
                        <option value="FREE_PASS" className="bg-surface-elevated text-text-primary">Free Pass</option>
                      </select>
                    </div>
                    {editVtDiscountType === "PERCENT" && (
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">Discount %</label>
                        <input
                          type="number" min="0" max="100" step="1"
                          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
                          value={editVtDiscountPct}
                          onChange={(e) => setEditVtDiscountPct(e.target.value)}
                        />
                      </div>
                    )}
                    {editVtDiscountType === "FIXED_AMOUNT" && (
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">Fixed Amount ($)</label>
                        <input
                          type="number" min="0" step="0.01"
                          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
                          value={editVtDiscountFixed}
                          onChange={(e) => setEditVtDiscountFixed(e.target.value)}
                        />
                      </div>
                    )}
                    {editVtDiscountType === "FREE_PASS" && (
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">Pass Days</label>
                        <input
                          type="number" min="1"
                          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
                          value={editVtPassDays}
                          onChange={(e) => setEditVtPassDays(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" disabled={saving} onClick={() => handleSave(tier.id)}>
                    {saving ? "..." : "Save"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div key={tier.id} className="rounded-lg border border-border bg-surface-elevated p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-medium text-text-primary">{tier.name}</span>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-text-tertiary">
                      <span>{tier.commissionPct}% commission</span>
                      <span>
                        {tier.monthlyVoucherLimit === -1
                          ? "Unlimited vouchers/mo"
                          : `${tier.monthlyVoucherLimit} vouchers/mo`}
                      </span>
                      <span>Template: {templateLabel(tier.voucherTemplate)}</span>
                      <span>{tier._count?.promoters ?? 0} promoters</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-3">
                    <Button variant="secondary" size="sm" onClick={() => startEdit(tier)}>Edit</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleDelete(tier.id)}>Delete</Button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Promoters Tab ──────────────────────────────────────────────────────────────

function PromotersTab() {
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [tiers, setTiers] = useState<PromoterTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<Record<string, string>>({});

  // Add-promoter search
  const [addSearchInput, setAddSearchInput] = useState("");
  const [addSearchResults, setAddSearchResults] = useState<{ id: string; email: string; name: string | null; promoter: null | { refCode: string } }[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const [addTierId, setAddTierId] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([
        fetch("/api/admin/promoters"),
        fetch("/api/admin/promoter-tiers"),
      ]);
      if (pRes.ok) setPromoters(await pRes.json());
      if (tRes.ok) setTiers(await tRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddSearch = async () => {
    if (!addSearchInput.trim()) return;
    setAddSearching(true);
    try {
      const params = new URLSearchParams({ search: addSearchInput.trim() });
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAddSearchResults(data.users ?? []);
      }
    } finally {
      setAddSearching(false);
    }
  };

  const handleMakePromoter = async (userId: string) => {
    const tierId = addTierId[userId] ?? "";
    if (!tierId) return;
    setAssigningId(userId);
    try {
      const res = await fetch(`/api/admin/promoters/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId }),
      });
      if (res.ok) {
        setAddSearchResults((prev) => prev.filter((u) => u.id !== userId));
        fetchData();
      }
    } finally {
      setAssigningId(null);
    }
  };

  const handleAssignTier = async (promoter: Promoter) => {
    const tierId = selectedTier[promoter.userId] ?? promoter.tierId ?? "";
    if (!tierId) return;
    setAssigningId(promoter.userId);
    try {
      const res = await fetch(`/api/admin/promoters/${promoter.userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId }),
      });
      if (res.ok) fetchData();
    } finally {
      setAssigningId(null);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this promoter? Their ref code will be deactivated.")) return;
    await fetch(`/api/admin/promoters/${userId}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <div className="space-y-4">
      {/* Add promoter */}
      <div className="rounded-lg border border-border bg-surface-elevated p-3 space-y-2">
        <p className="text-xs font-medium text-text-secondary">Add Promoter</p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary"
            placeholder="Search user by email or name..."
            value={addSearchInput}
            onChange={(e) => setAddSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddSearch(); }}
          />
          <Button variant="secondary" size="sm" disabled={addSearching} onClick={handleAddSearch}>
            {addSearching ? "..." : "Search"}
          </Button>
        </div>
        {addSearchResults.length > 0 && (
          <div className="space-y-1 pt-1">
            {addSearchResults.map((u) => (
              <div key={u.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-text-primary truncate">{u.email}{u.name ? ` (${u.name})` : ""}</span>
                {u.promoter ? (
                  <span className="text-xs text-text-tertiary">Already promoter</span>
                ) : (
                  <>
                    <select
                      className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary"
                      value={addTierId[u.id] ?? ""}
                      onChange={(e) => setAddTierId((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    >
                      <option value="" className="bg-surface-elevated text-text-primary">— tier —</option>
                      {tiers.map((t) => (
                        <option key={t.id} value={t.id} className="bg-surface-elevated text-text-primary">{t.name}</option>
                      ))}
                    </select>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={assigningId === u.id || !addTierId[u.id]}
                      onClick={() => handleMakePromoter(u.id)}
                    >
                      {assigningId === u.id ? "..." : "Add"}
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-tertiary border-t-accent-fg" />
        </div>
      ) : promoters.length === 0 ? (
        <p className="text-sm text-text-tertiary">No promoters found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-text-tertiary">
                <th className="pb-2 pr-3">Email</th>
                <th className="pb-2 pr-3">Ref Code</th>
                <th className="pb-2 pr-3">Tier</th>
                <th className="pb-2 pr-3">Earnings</th>
                <th className="pb-2 pr-3">Vouchers</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promoters.map((p) => (
                <tr key={p.id} className="border-b border-border-subtle/50">
                  <td className="py-2 pr-3 text-text-primary">{p.email}</td>
                  <td className="py-2 pr-3">
                    <span className="font-mono text-xs text-text-secondary">{p.refCode}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary"
                        value={selectedTier[p.userId] ?? p.tierId ?? ""}
                        onChange={(e) => setSelectedTier((prev) => ({ ...prev, [p.userId]: e.target.value }))}
                      >
                        <option value="" className="bg-surface-elevated text-text-primary">— No tier —</option>
                        {tiers.map((t) => (
                          <option key={t.id} value={t.id} className="bg-surface-elevated text-text-primary">{t.name}</option>
                        ))}
                      </select>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={assigningId === p.userId}
                        onClick={() => handleAssignTier(p)}
                      >
                        {assigningId === p.userId ? "..." : "Set"}
                      </Button>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-text-secondary">{formatDollars(p.totalEarnings)}</td>
                  <td className="py-2 pr-3 text-text-tertiary">{p.voucherUseCount}</td>
                  <td className="py-2">
                    <Button variant="secondary" size="sm" onClick={() => handleRemove(p.userId)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Vouchers Tab ───────────────────────────────────────────────────────────────

function VouchersTab() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [code, setCode] = useState("");
  const [voucherType, setVoucherType] = useState<"ADMIN_PUBLIC" | "ADMIN_SINGLE">("ADMIN_PUBLIC");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED_AMOUNT" | "FREE_PASS">("PERCENT");
  const [discountPct, setDiscountPct] = useState("");
  const [discountFixed, setDiscountFixed] = useState("");
  const [passDays, setPassDays] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [description, setDescription] = useState("");

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vouchers");
      if (res.ok) setVouchers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const resetForm = () => {
    setCode(""); setVoucherType("ADMIN_PUBLIC"); setDiscountType("PERCENT"); setDiscountPct(""); setDiscountFixed("");
    setPassDays(""); setMaxUses(""); setValidUntil(""); setDescription(""); setError(null);
  };

  const handleCreate = async () => {
    if (!code.trim()) { setError("Code is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        code: code.trim().toUpperCase(),
        type: voucherType,
        discountType,
      };
      if (maxUses) body.maxUses = parseInt(maxUses, 10);
      if (validUntil) body.validUntil = new Date(validUntil).toISOString();
      if (description) body.description = description;
      if (discountType === "PERCENT") body.discountPct = parseFloat(discountPct);
      if (discountType === "FIXED_AMOUNT") body.discountFixed = Math.round(parseFloat(discountFixed) * 100);
      if (discountType === "FREE_PASS") body.passDays = parseInt(passDays, 10);

      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        resetForm();
        setShowForm(false);
        fetchVouchers();
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to create voucher");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (voucher: Voucher) => {
    await fetch(`/api/admin/vouchers/${voucher.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !voucher.active }),
    });
    fetchVouchers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this voucher?")) return;
    await fetch(`/api/admin/vouchers/${id}`, { method: "DELETE" });
    fetchVouchers();
  };

  const discountLabel = (v: Voucher) => {
    if (v.discountType === "PERCENT") return `${v.discountPct}%`;
    if (v.discountType === "FIXED_AMOUNT") return formatCents(v.discountFixed ?? 0);
    if (v.discountType === "FREE_PASS") return `${v.passDays}d pass`;
    return "—";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">{vouchers.length} voucher(s)</p>
        <Button variant="primary" size="sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? "Cancel" : "New Voucher"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-surface-elevated p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Code</label>
              <input
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary uppercase"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="BONI25"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Voucher Type</label>
              <select
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                value={voucherType}
                onChange={(e) => setVoucherType(e.target.value as typeof voucherType)}
              >
                <option value="ADMIN_PUBLIC" className="bg-surface-elevated text-text-primary">Public (multi-use)</option>
                <option value="ADMIN_SINGLE" className="bg-surface-elevated text-text-primary">Single-user</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Discount Type</label>
              <select
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as typeof discountType)}
              >
                <option value="PERCENT" className="bg-surface-elevated text-text-primary">Percent</option>
                <option value="FIXED_AMOUNT" className="bg-surface-elevated text-text-primary">Fixed Amount</option>
                <option value="FREE_PASS" className="bg-surface-elevated text-text-primary">Free Pass</option>
              </select>
            </div>

            {discountType === "PERCENT" && (
              <div>
                <label className="block text-xs text-text-secondary mb-1">Discount %</label>
                <input
                  type="number" min="0" max="100" step="1"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  placeholder="25"
                />
              </div>
            )}
            {discountType === "FIXED_AMOUNT" && (
              <div>
                <label className="block text-xs text-text-secondary mb-1">Amount ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                  value={discountFixed}
                  onChange={(e) => setDiscountFixed(e.target.value)}
                  placeholder="5.00"
                />
              </div>
            )}
            {discountType === "FREE_PASS" && (
              <div>
                <label className="block text-xs text-text-secondary mb-1">Pass Days</label>
                <input
                  type="number" min="1"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                  value={passDays}
                  onChange={(e) => setPassDays(e.target.value)}
                  placeholder="3"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-text-secondary mb-1">Max Uses (blank = unlimited)</label>
              <input
                type="number" min="1"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Valid Until (blank = never)</label>
              <input
                type="date"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-text-secondary mb-1">Description (shown to user)</label>
              <input
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Special launch offer"
              />
            </div>
          </div>
          {error && <p className="text-xs text-danger-fg">{error}</p>}
          <Button variant="primary" size="sm" disabled={saving} onClick={handleCreate}>
            {saving ? "Creating..." : "Create Voucher"}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-tertiary border-t-accent-fg" />
        </div>
      ) : vouchers.length === 0 ? (
        <p className="text-sm text-text-tertiary">No vouchers yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-text-tertiary">
                <th className="pb-2 pr-3">Code</th>
                <th className="pb-2 pr-3">Type</th>
                <th className="pb-2 pr-3">Discount</th>
                <th className="pb-2 pr-3">Uses</th>
                <th className="pb-2 pr-3">Valid Until</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id} className="border-b border-border-subtle/50">
                  <td className="py-2 pr-3 font-mono text-xs text-text-primary">{v.code}</td>
                  <td className="py-2 pr-3">
                    <Badge variant="default">{v.type}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-text-secondary">{discountLabel(v)}</td>
                  <td className="py-2 pr-3 text-text-tertiary">
                    {v.useCount}/{v.maxUses ?? "∞"}
                  </td>
                  <td className="py-2 pr-3 text-text-tertiary">
                    {v.validUntil ? formatDate(v.validUntil) : "Never"}
                  </td>
                  <td className="py-2 pr-3">
                    <Badge variant={v.active ? "success" : "danger"}>
                      {v.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <Button variant="secondary" size="sm" onClick={() => handleToggleActive(v)}>
                        {v.active ? "Disable" : "Enable"}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleDelete(v.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Commissions Tab ────────────────────────────────────────────────────────────

function CommissionsTab() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const fetchCommissions = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status });
      const res = await fetch(`/api/admin/commissions?${params}`);
      if (res.ok) setCommissions((await res.json()).commissions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCommissions(statusFilter); }, [fetchCommissions, statusFilter]);

  // Group commissions by promoter for batch settle
  const byPromoter = commissions.reduce<
    Record<string, { promoterEmail: string; items: Commission[]; total: number }>
  >((acc, c) => {
    if (!acc[c.promoterId]) {
      acc[c.promoterId] = { promoterEmail: c.promoterEmail, items: [], total: 0 };
    }
    acc[c.promoterId].items.push(c);
    acc[c.promoterId].total += c.amount;
    return acc;
  }, {});

  const handleSettle = async (promoterId: string) => {
    const group = byPromoter[promoterId];
    if (!group) return;
    setSettling(promoterId);
    try {
      const res = await fetch("/api/admin/commissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: group.items.map((c) => c.id) }),
      });
      if (res.ok) fetchCommissions(statusFilter);
    } finally {
      setSettling(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-xs text-text-secondary">Status:</label>
        <select
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="PENDING" className="bg-surface-elevated text-text-primary">Pending</option>
          <option value="SETTLED" className="bg-surface-elevated text-text-primary">Settled</option>
          <option value="CANCELLED" className="bg-surface-elevated text-text-primary">Cancelled</option>
        </select>
        <p className="text-xs text-text-tertiary">{commissions.length} record(s)</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-tertiary border-t-accent-fg" />
        </div>
      ) : commissions.length === 0 ? (
        <p className="text-sm text-text-tertiary">No commissions with status &quot;{statusFilter}&quot;.</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(byPromoter).map(([promoterId, group]) => (
            <div key={promoterId} className="rounded-lg border border-border bg-surface-elevated p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-text-primary">{group.promoterEmail}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text-primary">
                    Total: {formatCents(group.total)}
                  </span>
                  {statusFilter === "PENDING" && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={settling === promoterId}
                      onClick={() => handleSettle(promoterId)}
                    >
                      {settling === promoterId ? "Settling..." : "Settle All"}
                    </Button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle text-left text-text-tertiary">
                      <th className="pb-1.5 pr-3">Date</th>
                      <th className="pb-1.5 pr-3">Amount</th>
                      <th className="pb-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((c) => (
                      <tr key={c.id} className="border-b border-border-subtle/30">
                        <td className="py-1.5 pr-3 text-text-tertiary">{formatDate(c.createdAt)}</td>
                        <td className="py-1.5 pr-3 text-text-secondary">{formatCents(c.amount)}</td>
                        <td className="py-1.5">
                          <Badge variant={c.status === "SETTLED" ? "success" : c.status === "PENDING" ? "warning" : "danger"}>
                            {c.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
