"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PromoterTier {
  id: string;
  name: string;
  commissionPct: number;
  monthlyLimit: number | null;
  voucherTemplate: string | null;
  _count?: { promoters: number };
}

interface Promoter {
  id: string;
  userId: string;
  refCode: string;
  totalEarnings: number;
  monthlyUsage: number;
  tierId: string | null;
  tier: PromoterTier | null;
  user: { email: string; name: string | null };
}

interface Voucher {
  id: string;
  code: string;
  discountType: string;
  discountPct: number | null;
  discountFixed: number | null;
  passDays: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  description: string | null;
}

interface Commission {
  id: string;
  promoterId: string;
  amount: number;
  status: string;
  createdAt: string;
  promoter: { refCode: string; user: { email: string } };
}

type Tab = "tiers" | "promoters" | "vouchers" | "commissions";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
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

  // Form fields
  const [name, setName] = useState("");
  const [commissionPct, setCommissionPct] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [voucherTemplate, setVoucherTemplate] = useState("");

  // Edit fields (mirror of form)
  const [editName, setEditName] = useState("");
  const [editCommissionPct, setEditCommissionPct] = useState("");
  const [editMonthlyLimit, setEditMonthlyLimit] = useState("");
  const [editVoucherTemplate, setEditVoucherTemplate] = useState("");

  const [error, setError] = useState<string | null>(null);

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
    setName(""); setCommissionPct(""); setMonthlyLimit(""); setVoucherTemplate("");
    setError(null);
  };

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
          monthlyLimit: monthlyLimit ? Math.round(parseFloat(monthlyLimit) * 100) : null,
          voucherTemplate: voucherTemplate || null,
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
    setEditMonthlyLimit(tier.monthlyLimit != null ? (tier.monthlyLimit / 100).toFixed(2) : "");
    setEditVoucherTemplate(tier.voucherTemplate ?? "");
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
          monthlyLimit: editMonthlyLimit ? Math.round(parseFloat(editMonthlyLimit) * 100) : null,
          voucherTemplate: editVoucherTemplate || null,
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
              <label className="block text-xs text-text-secondary mb-1">Monthly Limit ($, blank = unlimited)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                placeholder="500.00"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Voucher Template (code prefix)</label>
              <input
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                value={voucherTemplate}
                onChange={(e) => setVoucherTemplate(e.target.value.toUpperCase())}
                placeholder="e.g. PARTNER"
              />
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-text-tertiary">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Commission %</th>
                <th className="pb-2 pr-4">Monthly Limit</th>
                <th className="pb-2 pr-4">Voucher Template</th>
                <th className="pb-2 pr-4">Promoters</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr key={tier.id} className="border-b border-border-subtle/50">
                  <td className="py-2 pr-4 text-text-primary">
                    {editingId === tier.id ? (
                      <input
                        className="w-28 rounded border border-border bg-surface px-2 py-1 text-sm text-text-primary"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    ) : tier.name}
                  </td>
                  <td className="py-2 pr-4 text-text-secondary">
                    {editingId === tier.id ? (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-20 rounded border border-border bg-surface px-2 py-1 text-sm text-text-primary"
                        value={editCommissionPct}
                        onChange={(e) => setEditCommissionPct(e.target.value)}
                      />
                    ) : `${tier.commissionPct}%`}
                  </td>
                  <td className="py-2 pr-4 text-text-secondary">
                    {editingId === tier.id ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24 rounded border border-border bg-surface px-2 py-1 text-sm text-text-primary"
                        value={editMonthlyLimit}
                        onChange={(e) => setEditMonthlyLimit(e.target.value)}
                        placeholder="Unlimited"
                      />
                    ) : tier.monthlyLimit != null ? formatCents(tier.monthlyLimit) : "Unlimited"}
                  </td>
                  <td className="py-2 pr-4 text-text-secondary">
                    {editingId === tier.id ? (
                      <input
                        className="w-24 rounded border border-border bg-surface px-2 py-1 text-sm text-text-primary uppercase"
                        value={editVoucherTemplate}
                        onChange={(e) => setEditVoucherTemplate(e.target.value.toUpperCase())}
                        placeholder="—"
                      />
                    ) : tier.voucherTemplate ?? "—"}
                  </td>
                  <td className="py-2 pr-4 text-text-tertiary">{tier._count?.promoters ?? 0}</td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      {editingId === tier.id ? (
                        <>
                          <Button variant="primary" size="sm" disabled={saving} onClick={() => handleSave(tier.id)}>
                            {saving ? "..." : "Save"}
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => startEdit(tier)}>Edit</Button>
                          <Button variant="secondary" size="sm" onClick={() => handleDelete(tier.id)}>Delete</Button>
                        </>
                      )}
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

// ── Promoters Tab ──────────────────────────────────────────────────────────────

function PromotersTab() {
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [tiers, setTiers] = useState<PromoterTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<Record<string, string>>({});

  const fetchData = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      const [pRes, tRes] = await Promise.all([
        fetch(`/api/admin/promoters?${params}`),
        fetch("/api/admin/promoter-tiers"),
      ]);
      if (pRes.ok) setPromoters(await pRes.json());
      if (tRes.ok) setTiers(await tRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(""); }, [fetchData]);

  const handleSearch = () => {
    setSearch(searchInput);
    fetchData(searchInput);
  };

  const handleAssignTier = async (promoter: Promoter) => {
    const tierId = selectedTier[promoter.userId] ?? "";
    setAssigningId(promoter.userId);
    try {
      const res = await fetch(`/api/admin/promoters/${promoter.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: tierId || null }),
      });
      if (res.ok) fetchData(search);
    } finally {
      setAssigningId(null);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this promoter? Their ref code will be deactivated.")) return;
    await fetch(`/api/admin/promoters/${userId}`, { method: "DELETE" });
    fetchData(search);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary"
          placeholder="Search by email or refCode..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
        />
        <Button variant="secondary" size="sm" onClick={handleSearch}>Search</Button>
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
                <th className="pb-2 pr-3">Mo. Usage</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promoters.map((p) => (
                <tr key={p.id} className="border-b border-border-subtle/50">
                  <td className="py-2 pr-3 text-text-primary">{p.user.email}</td>
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
                  <td className="py-2 pr-3 text-text-secondary">{formatCents(p.totalEarnings)}</td>
                  <td className="py-2 pr-3 text-text-secondary">{formatCents(p.monthlyUsage)}</td>
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
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED_AMOUNT" | "FREE_PASS">("PERCENT");
  const [discountPct, setDiscountPct] = useState("");
  const [discountFixed, setDiscountFixed] = useState("");
  const [passDays, setPassDays] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
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
    setCode(""); setDiscountType("PERCENT"); setDiscountPct(""); setDiscountFixed("");
    setPassDays(""); setMaxUses(""); setExpiresAt(""); setDescription(""); setError(null);
  };

  const handleCreate = async () => {
    if (!code.trim()) { setError("Code is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        code: code.trim().toUpperCase(),
        discountType,
        maxUses: maxUses ? parseInt(maxUses, 10) : null,
        expiresAt: expiresAt || null,
        description: description || null,
      };
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
              <label className="block text-xs text-text-secondary mb-1">Expires At (blank = never)</label>
              <input
                type="date"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
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
                <th className="pb-2 pr-3">Expires</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id} className="border-b border-border-subtle/50">
                  <td className="py-2 pr-3 font-mono text-xs text-text-primary">{v.code}</td>
                  <td className="py-2 pr-3">
                    <Badge variant="default">{v.discountType}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-text-secondary">{discountLabel(v)}</td>
                  <td className="py-2 pr-3 text-text-tertiary">
                    {v.usedCount}/{v.maxUses ?? "∞"}
                  </td>
                  <td className="py-2 pr-3 text-text-tertiary">
                    {v.expiresAt ? formatDate(v.expiresAt) : "Never"}
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
      if (res.ok) setCommissions(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCommissions(statusFilter); }, [fetchCommissions, statusFilter]);

  const handleSettle = async (promoterId: string) => {
    setSettling(promoterId);
    try {
      const res = await fetch("/api/admin/commissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoterId, status: "SETTLED" }),
      });
      if (res.ok) fetchCommissions(statusFilter);
    } finally {
      setSettling(null);
    }
  };

  // Group commissions by promoter for batch settle
  const byPromoter = commissions.reduce<Record<string, { promoter: Commission["promoter"]; items: Commission[]; total: number }>>((acc, c) => {
    if (!acc[c.promoterId]) {
      acc[c.promoterId] = { promoter: c.promoter, items: [], total: 0 };
    }
    acc[c.promoterId].items.push(c);
    acc[c.promoterId].total += c.amount;
    return acc;
  }, {});

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
                <div>
                  <span className="text-sm font-medium text-text-primary">{group.promoter.user.email}</span>
                  <span className="ml-2 font-mono text-xs text-text-tertiary">({group.promoter.refCode})</span>
                </div>
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
