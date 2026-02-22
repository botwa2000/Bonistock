"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AdminStats {
  users: {
    total: number;
    newThisWeek: number;
    newThisMonth: number;
    byTier: { tier: string; count: number }[];
    byRegion: { region: string; count: number }[];
  };
  transactions: {
    activeSubscriptions: number;
    totalPassPurchases: number;
  };
  stocks: {
    count: number;
    etfCount: number;
    lastRefresh: string | null;
  };
  health: {
    dbConnected: boolean;
    uptime: number;
  };
  recentActivity: {
    id: string;
    action: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    userEmail: string | null;
    userName: string | null;
  }[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  features: string[] | null;
  type: "SUBSCRIPTION" | "PASS";
  priceAmount: number;
  currency: string;
  billingInterval: "MONTH" | "YEAR" | null;
  passType: "ONE_DAY" | "THREE_DAY" | "TWELVE_DAY" | null;
  passDays: number | null;
  trialDays: number | null;
  stripeProductId: string;
  stripePriceId: string;
  active: boolean;
  highlighted: boolean;
  sortOrder: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  region: string;
  tier: string;
  status: string;
  createdAt: string;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminPage() {
  const t = useTranslations("admin");
  const router = useRouter();
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [fetching, setFetching] = useState(true);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit product state
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{
    name: string;
    description: string;
    priceAmount: string;
    trialDays: string;
    highlighted: boolean;
  }>({ name: "", description: "", priceAmount: "", trialDays: "", highlighted: false });
  const [saving, setSaving] = useState(false);

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersSearchInput, setUsersSearchInput] = useState("");

  // Create form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<"SUBSCRIPTION" | "PASS">("SUBSCRIPTION");
  const [formPriceAmount, setFormPriceAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState("usd");
  const [formBillingInterval, setFormBillingInterval] = useState<"MONTH" | "YEAR">("MONTH");
  const [formPassType, setFormPassType] = useState<"ONE_DAY" | "THREE_DAY" | "TWELVE_DAY">("ONE_DAY");
  const [formPassDays, setFormPassDays] = useState("");
  const [formTrialDays, setFormTrialDays] = useState("");
  const [formFeatures, setFormFeatures] = useState("");
  const [formHighlighted, setFormHighlighted] = useState(false);

  useEffect(() => {
    if (!loading && user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [loading, user, router]);

  const fetchStats = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        setStats(await res.json());
      }
    } finally {
      setFetching(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      if (res.ok) {
        setProducts(await res.json());
      }
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (page: number, search: string) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setUsersPage(data.page);
        setUsersTotalPages(data.totalPages);
        setUsersTotal(data.total);
      }
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchStats();
      fetchProducts();
      fetchUsers(1, "");
    }
  }, [user, fetchStats, fetchProducts, fetchUsers]);

  const handleToggleActive = async (product: Product) => {
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !product.active }),
    });
    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p))
      );
    }
  };

  const startEditing = (product: Product) => {
    setEditingProduct(product.id);
    setEditFields({
      name: product.name,
      description: product.description,
      priceAmount: (product.priceAmount / 100).toFixed(2),
      trialDays: product.trialDays != null ? String(product.trialDays) : "",
      highlighted: product.highlighted,
    });
  };

  const handleSaveProduct = async (product: Product) => {
    setSaving(true);
    const priceInCents = Math.round(parseFloat(editFields.priceAmount) * 100);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      setSaving(false);
      return;
    }

    const body: Record<string, unknown> = {
      name: editFields.name,
      description: editFields.description,
      highlighted: editFields.highlighted,
    };

    if (priceInCents !== product.priceAmount) {
      body.priceAmount = priceInCents;
    }

    if (product.type === "SUBSCRIPTION") {
      body.trialDays = editFields.trialDays ? parseInt(editFields.trialDays, 10) : null;
    }

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
        setEditingProduct(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormType("SUBSCRIPTION");
    setFormPriceAmount("");
    setFormCurrency("usd");
    setFormBillingInterval("MONTH");
    setFormPassType("ONE_DAY");
    setFormPassDays("");
    setFormTrialDays("");
    setFormFeatures("");
    setFormHighlighted(false);
    setCreateError(null);
  };

  const handleCreateProduct = async () => {
    setCreating(true);
    setCreateError(null);

    const priceInCents = Math.round(parseFloat(formPriceAmount) * 100);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      setCreateError("Invalid price amount");
      setCreating(false);
      return;
    }

    const body: Record<string, unknown> = {
      name: formName,
      description: formDescription,
      type: formType,
      priceAmount: priceInCents,
      currency: formCurrency,
      highlighted: formHighlighted,
    };

    if (formType === "SUBSCRIPTION") {
      body.billingInterval = formBillingInterval;
      if (formTrialDays) body.trialDays = parseInt(formTrialDays, 10);
    } else {
      body.passType = formPassType;
      body.passDays = parseInt(formPassDays, 10) || undefined;
    }

    const features = formFeatures
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (features.length > 0) body.features = features;

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowCreateForm(false);
        resetForm();
        fetchProducts();
      } else {
        const data = await res.json();
        setCreateError(data.error || "Failed to create product");
      }
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<{ candidates: number; populated: number; errors: number } | null>(null);

  const handleDiscoverStocks = async () => {
    setDiscovering(true);
    setDiscoverResult(null);
    try {
      const res = await fetch("/api/admin/discover-stocks", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setDiscoverResult(data);
        fetchStats();
      }
    } catch {
      // network error
    } finally {
      setDiscovering(false);
    }
  };

  const handleUsersSearch = () => {
    setUsersSearch(usersSearchInput);
    fetchUsers(1, usersSearchInput);
  };

  if (loading || user?.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">{t("title")}</h1>
            <p className="text-sm text-text-secondary">{t("subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleDiscoverStocks} disabled={discovering}>
              {discovering ? t("refreshingStocks") : t("discoverStocks")}
            </Button>
            <Button variant="secondary" size="sm" onClick={fetchStats} disabled={fetching}>
              {fetching ? t("refreshing") : t("refresh")}
            </Button>
          </div>
        </div>

        {discoverResult && (
          <Card variant="glass">
            <p className="text-sm text-emerald-400">
              {t("stocksDiscovered", {
                candidates: discoverResult.candidates,
                populated: discoverResult.populated,
                errors: discoverResult.errors,
              })}
            </p>
          </Card>
        )}

        {stats && (
          <>
            {/* Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card variant="glass">
                <div className="text-sm text-text-secondary">{t("totalUsers")}</div>
                <div className="mt-1 text-3xl font-semibold text-text-primary">{stats.users.total}</div>
                <div className="mt-1 text-xs text-emerald-400">+{stats.users.newThisWeek} {t("thisWeek")}</div>
              </Card>
              <Card variant="glass">
                <div className="text-sm text-text-secondary">{t("activeSubscriptions")}</div>
                <div className="mt-1 text-3xl font-semibold text-text-primary">{stats.transactions.activeSubscriptions}</div>
              </Card>
              <Card variant="glass">
                <div className="text-sm text-text-secondary">{t("passesSold")}</div>
                <div className="mt-1 text-3xl font-semibold text-text-primary">{stats.transactions.totalPassPurchases}</div>
              </Card>
              <Card variant="glass">
                <div className="text-sm text-text-secondary">{t("stocksAndEtfs")}</div>
                <div className="mt-1 text-3xl font-semibold text-text-primary">
                  {stats.stocks.count + stats.stocks.etfCount}
                </div>
                <div className="mt-1 text-xs text-text-tertiary">
                  {stats.stocks.count} {t("stocks")} · {stats.stocks.etfCount} {t("etfs")}
                  {stats.stocks.lastRefresh && (
                    <> · {t("lastRefresh")}: {formatDate(stats.stocks.lastRefresh)}</>
                  )}
                </div>
              </Card>
            </div>

            {/* Users Section */}
            <Card variant="glass">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-primary">
                  {t("users")} ({usersTotal})
                </h3>
                <div className="flex gap-2">
                  <input
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary"
                    placeholder={t("searchUsers")}
                    value={usersSearchInput}
                    onChange={(e) => setUsersSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleUsersSearch(); }}
                  />
                  <Button variant="secondary" size="sm" onClick={handleUsersSearch}>
                    {t("action")}
                  </Button>
                </div>
              </div>

              {usersLoading ? (
                <div className="flex justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-text-tertiary">{t("noUsers")}</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-subtle text-left text-text-tertiary">
                          <th className="pb-2">{t("name")}</th>
                          <th className="pb-2">{t("email")}</th>
                          <th className="pb-2">{t("role")}</th>
                          <th className="pb-2">{t("tier")}</th>
                          <th className="pb-2">{t("region")}</th>
                          <th className="pb-2">{t("joined")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id} className="border-b border-border-subtle/50">
                            <td className="py-2 text-text-primary">{u.name ?? "\u2014"}</td>
                            <td className="py-2 text-text-secondary">{u.email}</td>
                            <td className="py-2">
                              <Badge variant={u.role === "ADMIN" ? "warning" : "default"}>
                                {u.role}
                              </Badge>
                            </td>
                            <td className="py-2">
                              <Badge variant={u.tier === "PLUS" ? "accent" : u.tier === "PASS" ? "info" : "default"}>
                                {u.tier}
                              </Badge>
                            </td>
                            <td className="py-2 text-text-secondary">{u.region}</td>
                            <td className="py-2 text-text-tertiary whitespace-nowrap">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {usersTotalPages > 1 && (
                    <div className="mt-3 flex items-center justify-between">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={usersPage <= 1}
                        onClick={() => fetchUsers(usersPage - 1, usersSearch)}
                      >
                        {t("previous")}
                      </Button>
                      <span className="text-xs text-text-tertiary">
                        {t("pageOf", { page: usersPage, total: usersTotalPages })}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={usersPage >= usersTotalPages}
                        onClick={() => fetchUsers(usersPage + 1, usersSearch)}
                      >
                        {t("nextPage")}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Products Section */}
            <Card variant="glass">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-primary">{t("products")}</h3>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    resetForm();
                    setShowCreateForm(!showCreateForm);
                  }}
                >
                  {showCreateForm ? t("cancel") : t("newProduct")}
                </Button>
              </div>

              {/* Create Form */}
              {showCreateForm && (
                <div className="mb-4 rounded-lg border border-border bg-surface-elevated p-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">{t("productName")}</label>
                      <input
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Plus Monthly"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">{t("productType")}</label>
                      <select
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as "SUBSCRIPTION" | "PASS")}
                      >
                        <option value="SUBSCRIPTION">{t("subscription")}</option>
                        <option value="PASS">{t("pass")}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-text-secondary mb-1">{t("productDescription")}</label>
                    <input
                      className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Full access for active investors"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">{t("price")} ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                        value={formPriceAmount}
                        onChange={(e) => setFormPriceAmount(e.target.value)}
                        placeholder="6.99"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">{t("currency")}</label>
                      <input
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                        value={formCurrency}
                        onChange={(e) => setFormCurrency(e.target.value)}
                        placeholder="usd"
                      />
                    </div>
                    {formType === "SUBSCRIPTION" ? (
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">{t("billingInterval")}</label>
                        <select
                          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                          value={formBillingInterval}
                          onChange={(e) => setFormBillingInterval(e.target.value as "MONTH" | "YEAR")}
                        >
                          <option value="MONTH">{t("monthly")}</option>
                          <option value="YEAR">{t("yearly")}</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">{t("passType")}</label>
                        <select
                          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                          value={formPassType}
                          onChange={(e) => setFormPassType(e.target.value as "ONE_DAY" | "THREE_DAY" | "TWELVE_DAY")}
                        >
                          <option value="ONE_DAY">ONE_DAY</option>
                          <option value="THREE_DAY">THREE_DAY</option>
                          <option value="TWELVE_DAY">TWELVE_DAY</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {formType === "SUBSCRIPTION" && (
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">{t("trialDays")}</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                        value={formTrialDays}
                        onChange={(e) => setFormTrialDays(e.target.value)}
                        placeholder="14"
                      />
                    </div>
                  )}

                  {formType === "PASS" && (
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">{t("passDays")}</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                        value={formPassDays}
                        onChange={(e) => setFormPassDays(e.target.value)}
                        placeholder="1"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-text-secondary mb-1">{t("features")}</label>
                    <textarea
                      className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                      rows={4}
                      value={formFeatures}
                      onChange={(e) => setFormFeatures(e.target.value)}
                      placeholder="One feature per line"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="highlighted"
                      checked={formHighlighted}
                      onChange={(e) => setFormHighlighted(e.target.checked)}
                      className="rounded border-border"
                    />
                    <label htmlFor="highlighted" className="text-sm text-text-secondary">
                      {t("highlighted")}
                    </label>
                  </div>

                  {createError && (
                    <p className="text-sm text-red-400">{createError}</p>
                  )}

                  <Button
                    variant="primary"
                    size="sm"
                    disabled={creating || !formName || !formDescription || !formPriceAmount}
                    onClick={handleCreateProduct}
                  >
                    {creating ? t("creating") : t("createProduct")}
                  </Button>
                </div>
              )}

              {/* Products Table */}
              {productsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
                </div>
              ) : products.length === 0 ? (
                <p className="text-sm text-text-tertiary">{t("noProducts")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-subtle text-left text-text-tertiary">
                        <th className="pb-2">{t("productName")}</th>
                        <th className="pb-2">{t("productType")}</th>
                        <th className="pb-2">{t("price")}</th>
                        <th className="pb-2">{t("status")}</th>
                        <th className="pb-2">{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id} className="border-b border-border-subtle/50">
                          <td className="py-2 text-text-primary">
                            {editingProduct === product.id ? (
                              <input
                                className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary"
                                value={editFields.name}
                                onChange={(e) => setEditFields((f) => ({ ...f, name: e.target.value }))}
                              />
                            ) : (
                              <>
                                {product.name}
                                {product.highlighted && (
                                  <Badge variant="accent" className="ml-2">{t("highlighted")}</Badge>
                                )}
                              </>
                            )}
                          </td>
                          <td className="py-2 text-text-secondary">
                            <Badge variant={product.type === "SUBSCRIPTION" ? "info" : "default"}>
                              {product.type === "SUBSCRIPTION" ? t("subscription") : t("pass")}
                            </Badge>
                            {product.billingInterval && (
                              <span className="ml-1 text-xs text-text-tertiary">
                                ({product.billingInterval === "MONTH" ? t("monthly") : t("yearly")})
                              </span>
                            )}
                            {product.passType && (
                              <span className="ml-1 text-xs text-text-tertiary">
                                ({product.passDays}d)
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-text-secondary">
                            {editingProduct === product.id ? (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-24 rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary"
                                value={editFields.priceAmount}
                                onChange={(e) => setEditFields((f) => ({ ...f, priceAmount: e.target.value }))}
                              />
                            ) : (
                              formatCents(product.priceAmount)
                            )}
                          </td>
                          <td className="py-2">
                            <Badge variant={product.active ? "success" : "danger"}>
                              {product.active ? t("active") : t("inactive")}
                            </Badge>
                          </td>
                          <td className="py-2">
                            <div className="flex gap-1">
                              {editingProduct === product.id ? (
                                <>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    disabled={saving}
                                    onClick={() => handleSaveProduct(product)}
                                  >
                                    {saving ? t("saving") : t("saveProduct")}
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setEditingProduct(null)}
                                  >
                                    {t("cancel")}
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => startEditing(product)}
                                  >
                                    {t("editProduct")}
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleToggleActive(product)}
                                  >
                                    {product.active ? t("deactivate") : t("activate")}
                                  </Button>
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
            </Card>

            {/* Two-column grid */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Users by Tier */}
              <Card variant="glass">
                <h3 className="mb-3 text-sm font-semibold text-text-primary">{t("usersByTier")}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-left text-text-tertiary">
                      <th className="pb-2">{t("tier")}</th>
                      <th className="pb-2 text-right">{t("count")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.users.byTier.map((row) => (
                      <tr key={row.tier} className="border-b border-border-subtle/50">
                        <td className="py-2 text-text-primary">
                          <Badge variant={row.tier === "PLUS" ? "accent" : row.tier === "PASS" ? "info" : "default"}>
                            {row.tier}
                          </Badge>
                        </td>
                        <td className="py-2 text-right text-text-secondary">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Users by Region */}
              <Card variant="glass">
                <h3 className="mb-3 text-sm font-semibold text-text-primary">{t("usersByRegion")}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-left text-text-tertiary">
                      <th className="pb-2">{t("region")}</th>
                      <th className="pb-2 text-right">{t("count")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.users.byRegion.map((row) => (
                      <tr key={row.region} className="border-b border-border-subtle/50">
                        <td className="py-2 text-text-primary">{row.region}</td>
                        <td className="py-2 text-right text-text-secondary">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Stock Data Health */}
              <Card variant="glass">
                <h3 className="mb-3 text-sm font-semibold text-text-primary">{t("stockDataHealth")}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">{t("stocks")}</span>
                    <span className="text-text-primary">{stats.stocks.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">{t("etfs")}</span>
                    <span className="text-text-primary">{stats.stocks.etfCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">{t("lastRefresh")}</span>
                    <span className="text-text-primary">
                      {stats.stocks.lastRefresh ? formatDate(stats.stocks.lastRefresh) : t("never")}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Site Health */}
              <Card variant="glass">
                <h3 className="mb-3 text-sm font-semibold text-text-primary">{t("siteHealth")}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">{t("database")}</span>
                    <Badge variant={stats.health.dbConnected ? "success" : "danger"}>
                      {stats.health.dbConnected ? t("connected") : t("disconnected")}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">{t("uptime")}</span>
                    <span className="text-text-primary">{formatUptime(stats.health.uptime)}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card variant="glass">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">{t("recentActivity")}</h3>
              {stats.recentActivity.length === 0 ? (
                <p className="text-sm text-text-tertiary">{t("noActivity")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-subtle text-left text-text-tertiary">
                        <th className="pb-2">{t("time")}</th>
                        <th className="pb-2">{t("user")}</th>
                        <th className="pb-2">{t("action")}</th>
                        <th className="pb-2">{t("details")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentActivity.map((entry) => (
                        <tr key={entry.id} className="border-b border-border-subtle/50">
                          <td className="py-2 text-text-tertiary whitespace-nowrap">
                            {formatDate(entry.createdAt)}
                          </td>
                          <td className="py-2 text-text-secondary">{entry.userEmail ?? "\u2014"}</td>
                          <td className="py-2">
                            <Badge variant="default">{entry.action}</Badge>
                          </td>
                          <td className="py-2 text-text-tertiary text-xs max-w-[200px] truncate">
                            {entry.metadata ? JSON.stringify(entry.metadata) : "\u2014"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
  );
}
