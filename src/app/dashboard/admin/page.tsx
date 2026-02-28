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

interface ProductPriceEntry {
  currencyId: string;
  amount: number;
  iosAmount: number | null;
  currency: { id: string; name: string; symbol: string };
}

interface Product {
  id: string;
  name: string;
  description: string;
  features: string[] | null;
  type: "SUBSCRIPTION" | "PASS";
  priceAmount: number;
  usualPrice: number | null;
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
  appleProductId: string | null;
  iosPriceAmount: number | null;
  eurPriceAmount: number | null;
  eurIosPriceAmount: number | null;
  prices: ProductPriceEntry[];
}

interface CurrencyItem {
  id: string;
  name: string;
  symbol: string;
  active: boolean;
  _count: { productPrices: number };
}

interface RegionCurrencyItem {
  id: string;
  region: string;
  currencyId: string;
  isDefault: boolean;
  currency: { id: string; name: string; symbol: string };
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
  const [statsError, setStatsError] = useState(false);

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
    usualPrice: string;
    trialDays: string;
    highlighted: boolean;
    appleProductId: string;
    iosPriceAmount: string;
  }>({ name: "", description: "", priceAmount: "", usualPrice: "", trialDays: "", highlighted: false, appleProductId: "", iosPriceAmount: "" });
  const [saving, setSaving] = useState(false);

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersSearchInput, setUsersSearchInput] = useState("");

  // Edit user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserFields, setEditUserFields] = useState<{ tier: string; role: string }>({ tier: "FREE", role: "USER" });
  const [savingUser, setSavingUser] = useState(false);

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
  const [formUsualPrice, setFormUsualPrice] = useState("");
  const [formHighlighted, setFormHighlighted] = useState(false);
  const [formAppleProductId, setFormAppleProductId] = useState("");
  const [formIosPriceAmount, setFormIosPriceAmount] = useState("");
  const [formEurPriceAmount, setFormEurPriceAmount] = useState("");
  const [formEurIosPriceAmount, setFormEurIosPriceAmount] = useState("");

  // Currency management state
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [regionCurrencies, setRegionCurrencies] = useState<RegionCurrencyItem[]>([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(false);
  const [newCurrencyId, setNewCurrencyId] = useState("");
  const [newCurrencyName, setNewCurrencyName] = useState("");
  const [newCurrencySymbol, setNewCurrencySymbol] = useState("");
  const [creatingCurrency, setCreatingCurrency] = useState(false);
  const [newRcRegion, setNewRcRegion] = useState<"GLOBAL" | "DE">("GLOBAL");
  const [newRcCurrency, setNewRcCurrency] = useState("");
  const [creatingRc, setCreatingRc] = useState(false);

  // Product price management state
  const [editPriceProductId, setEditPriceProductId] = useState<string | null>(null);
  const [priceEntries, setPriceEntries] = useState<{ currencyId: string; amount: string; iosAmount: string }[]>([]);
  const [savingPrices, setSavingPrices] = useState(false);

  useEffect(() => {
    if (!loading && user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [loading, user, router]);

  const fetchStats = useCallback(async () => {
    setFetching(true);
    setStatsError(false);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        setStats(await res.json());
      } else {
        setStatsError(true);
      }
    } catch {
      setStatsError(true);
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

  const fetchEmailTemplates = useCallback(async () => {
    setEmailTemplatesLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates");
      if (res.ok) setEmailTemplates(await res.json());
    } finally {
      setEmailTemplatesLoading(false);
    }
  }, []);

  const fetchCurrencies = useCallback(async () => {
    setCurrenciesLoading(true);
    try {
      const [currRes, rcRes] = await Promise.all([
        fetch("/api/admin/currencies"),
        fetch("/api/admin/region-currencies"),
      ]);
      if (currRes.ok) setCurrencies(await currRes.json());
      if (rcRes.ok) setRegionCurrencies(await rcRes.json());
    } finally {
      setCurrenciesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchStats();
      fetchProducts();
      fetchUsers(1, "");
      fetchEmailTemplates();
      fetchCurrencies();
    }
  }, [user, fetchStats, fetchProducts, fetchUsers, fetchEmailTemplates, fetchCurrencies]);

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
      usualPrice: product.usualPrice != null ? (product.usualPrice / 100).toFixed(2) : "",
      trialDays: product.trialDays != null ? String(product.trialDays) : "",
      highlighted: product.highlighted,
      appleProductId: product.appleProductId ?? "",
      iosPriceAmount: product.iosPriceAmount != null ? (product.iosPriceAmount / 100).toFixed(2) : "",
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

    if (editFields.usualPrice) {
      const usualInCents = Math.round(parseFloat(editFields.usualPrice) * 100);
      if (!isNaN(usualInCents) && usualInCents > 0) {
        body.usualPrice = usualInCents;
      }
    } else {
      body.usualPrice = null;
    }

    if (product.type === "SUBSCRIPTION") {
      body.trialDays = editFields.trialDays ? parseInt(editFields.trialDays, 10) : null;
    }

    // Apple IAP fields
    body.appleProductId = editFields.appleProductId || null;
    if (editFields.iosPriceAmount) {
      const iosInCents = Math.round(parseFloat(editFields.iosPriceAmount) * 100);
      if (!isNaN(iosInCents) && iosInCents > 0) {
        body.iosPriceAmount = iosInCents;
      }
    } else {
      body.iosPriceAmount = null;
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
    setFormUsualPrice("");
    setFormCurrency("usd");
    setFormBillingInterval("MONTH");
    setFormPassType("ONE_DAY");
    setFormPassDays("");
    setFormTrialDays("");
    setFormFeatures("");
    setFormHighlighted(false);
    setFormAppleProductId("");
    setFormIosPriceAmount("");
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
      ...(formUsualPrice && { usualPrice: Math.round(parseFloat(formUsualPrice) * 100) }),
      ...(formAppleProductId && { appleProductId: formAppleProductId }),
      ...(formIosPriceAmount && { iosPriceAmount: Math.round(parseFloat(formIosPriceAmount) * 100) }),
      ...(formEurPriceAmount && { eurPriceAmount: Math.round(parseFloat(formEurPriceAmount) * 100) }),
      ...(formEurIosPriceAmount && { eurIosPriceAmount: Math.round(parseFloat(formEurIosPriceAmount) * 100) }),
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

  // Email templates state
  const [emailTemplates, setEmailTemplates] = useState<{ id: string; slug: string; name: string; subject: string; body: string; updatedAt: string }[]>([]);
  const [emailTemplatesLoading, setEmailTemplatesLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ template: string; ok: boolean; message: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Placeholder metadata per slug
  const templatePlaceholders: Record<string, string[]> = {
    verification: ["userName", "verifyUrl"],
    passwordReset: ["userName", "resetUrl"],
    welcome: ["userName"],
    passConfirmation: ["userName", "passType", "activations"],
    subscriptionConfirmation: ["userName", "tier", "amount"],
    subscriptionCanceled: ["userName", "endDate"],
    emailChange: ["userName", "newEmail", "confirmUrl"],
    paymentFailed: ["userName", "settingsUrl"],
    accountDeletion: ["userName"],
  };

  const handleSendTest = async (templateId: string) => {
    setSendingTest(templateId);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/email-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateId }),
      });
      const data = await res.json();
      setTestResult({ template: templateId, ok: res.ok, message: data.message ?? data.error ?? "Done" });
    } catch {
      setTestResult({ template: templateId, ok: false, message: "Network error" });
    } finally {
      setSendingTest(null);
    }
  };

  const handlePreview = async (templateId: string, templateName: string) => {
    try {
      const res = await fetch(`/api/admin/email-test?template=${templateId}`);
      const data = await res.json();
      if (data.html) {
        setPreviewHtml(data.html);
        setPreviewName(templateName);
      }
    } catch {
      // ignore
    }
  };

  const startEditingTemplate = (tmpl: typeof emailTemplates[number]) => {
    setEditingTemplate(tmpl.slug);
    setEditSubject(tmpl.subject);
    setEditBody(tmpl.body);
  };

  const cancelEditingTemplate = () => {
    setEditingTemplate(null);
    setEditSubject("");
    setEditBody("");
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    setSavingTemplate(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${editingTemplate}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editSubject, body: editBody }),
      });
      if (res.ok) {
        const updated = await res.json();
        setEmailTemplates((prev) =>
          prev.map((t) => (t.slug === editingTemplate ? updated : t))
        );
        setEditingTemplate(null);
      }
    } finally {
      setSavingTemplate(false);
    }
  };

  // Currency management handlers
  const handleCreateCurrency = async () => {
    if (!newCurrencyId || !newCurrencyName || !newCurrencySymbol) return;
    setCreatingCurrency(true);
    try {
      const res = await fetch("/api/admin/currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newCurrencyId.toUpperCase(), name: newCurrencyName, symbol: newCurrencySymbol }),
      });
      if (res.ok) {
        setNewCurrencyId("");
        setNewCurrencyName("");
        setNewCurrencySymbol("");
        fetchCurrencies();
      }
    } finally {
      setCreatingCurrency(false);
    }
  };

  const handleToggleCurrency = async (curr: CurrencyItem) => {
    await fetch("/api/admin/currencies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: curr.id, active: !curr.active }),
    });
    fetchCurrencies();
  };

  const handleCreateRegionCurrency = async () => {
    if (!newRcCurrency) return;
    setCreatingRc(true);
    try {
      const res = await fetch("/api/admin/region-currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: newRcRegion, currencyId: newRcCurrency }),
      });
      if (res.ok) {
        setNewRcCurrency("");
        fetchCurrencies();
      }
    } finally {
      setCreatingRc(false);
    }
  };

  const handleDeleteRegionCurrency = async (id: string) => {
    await fetch("/api/admin/region-currencies", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchCurrencies();
  };

  // Product price management handlers
  const startEditingPrices = (product: Product) => {
    setEditPriceProductId(product.id);
    const entries = product.prices.map((p) => ({
      currencyId: p.currencyId,
      amount: (p.amount / 100).toFixed(2),
      iosAmount: p.iosAmount != null ? (p.iosAmount / 100).toFixed(2) : "",
    }));
    setPriceEntries(entries);
  };

  const addPriceEntry = () => {
    const usedCurrencies = priceEntries.map((e) => e.currencyId);
    const available = currencies.filter((c) => c.active && !usedCurrencies.includes(c.id));
    if (available.length === 0) return;
    setPriceEntries([...priceEntries, { currencyId: available[0].id, amount: "", iosAmount: "" }]);
  };

  const removePriceEntry = (idx: number) => {
    setPriceEntries(priceEntries.filter((_, i) => i !== idx));
  };

  const handleSavePrices = async (productId: string) => {
    setSavingPrices(true);
    try {
      // Get current product prices from state
      const product = products.find((p) => p.id === productId);
      const existingCurrencies = product?.prices.map((p) => p.currencyId) ?? [];

      // Delete removed currencies
      const newCurrencyIds = priceEntries.map((e) => e.currencyId);
      for (const currId of existingCurrencies) {
        if (!newCurrencyIds.includes(currId)) {
          await fetch("/api/admin/product-prices", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, currencyId: currId }),
          });
        }
      }

      // Upsert new/updated entries
      for (const entry of priceEntries) {
        if (!entry.amount) continue;
        const amount = Math.round(parseFloat(entry.amount) * 100);
        if (isNaN(amount) || amount <= 0) continue;
        const iosAmount = entry.iosAmount ? Math.round(parseFloat(entry.iosAmount) * 100) : null;
        await fetch("/api/admin/product-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, currencyId: entry.currencyId, amount, iosAmount }),
        });
      }

      setEditPriceProductId(null);
      fetchProducts();
    } finally {
      setSavingPrices(false);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const insertPlaceholder = (placeholder: string) => {
    document.execCommand("insertText", false, `{{${placeholder}}}`);
  };

  const insertCtaButton = () => {
    document.execCommand(
      "insertHTML",
      false,
      '<a href="#" class="btn" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Button Text</a>'
    );
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

  const startEditingUser = (u: AdminUser) => {
    setEditingUserId(u.id);
    setEditUserFields({ tier: u.tier, role: u.role });
  };

  const handleSaveUser = async (userId: string) => {
    setSavingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editUserFields),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
        setEditingUserId(null);
      }
    } finally {
      setSavingUser(false);
    }
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

        {/* Stat Cards */}
        {fetching && !stats ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
          </div>
        ) : statsError && !stats ? (
          <Card variant="glass" className="text-center py-4">
            <p className="text-sm text-danger-fg">{t("statsError")}</p>
            <Button variant="secondary" size="sm" className="mt-2" onClick={fetchStats}>
              {t("retry")}
            </Button>
          </Card>
        ) : stats ? (
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
        ) : null}

        {/* Users Section — always renders independently */}
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
                      <th className="pb-2">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border-subtle/50">
                        <td className="py-2 text-text-primary">{u.name ?? "\u2014"}</td>
                        <td className="py-2 text-text-secondary">{u.email}</td>
                        <td className="py-2">
                          {editingUserId === u.id ? (
                            <select
                              className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary"
                              value={editUserFields.role}
                              onChange={(e) => setEditUserFields((f) => ({ ...f, role: e.target.value }))}
                            >
                              <option value="USER">USER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          ) : (
                            <Badge variant={u.role === "ADMIN" ? "warning" : "default"}>
                              {u.role}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2">
                          {editingUserId === u.id ? (
                            <select
                              className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary"
                              value={editUserFields.tier}
                              onChange={(e) => setEditUserFields((f) => ({ ...f, tier: e.target.value }))}
                            >
                              <option value="FREE">FREE</option>
                              <option value="PLUS">PLUS</option>
                              <option value="PASS">PASS</option>
                            </select>
                          ) : (
                            <Badge variant={u.tier === "PLUS" ? "accent" : u.tier === "PASS" ? "info" : "default"}>
                              {u.tier}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 text-text-secondary">{u.region}</td>
                        <td className="py-2 text-text-tertiary whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            {editingUserId === u.id ? (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={savingUser}
                                  onClick={() => handleSaveUser(u.id)}
                                >
                                  {savingUser ? t("saving") : t("saveUser")}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setEditingUserId(null)}
                                >
                                  {t("cancel")}
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => startEditingUser(u)}
                              >
                                {t("editUser")}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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

        {/* Products & Pricing Section — always renders independently */}
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

              <div className="grid gap-3 sm:grid-cols-4">
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
                  <label className="block text-xs text-text-secondary mb-1">Usual Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                    value={formUsualPrice}
                    onChange={(e) => setFormUsualPrice(e.target.value)}
                    placeholder="9.99"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">{t("appleProductId")}</label>
                  <input
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                    value={formAppleProductId}
                    onChange={(e) => setFormAppleProductId(e.target.value)}
                    placeholder="com.bonifatus.bonistock.plus.monthly"
                  />
                  <p className="text-[10px] text-text-tertiary mt-1">Must match the Product ID in App Store Connect</p>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">{t("iosPrice")}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                    value={formIosPriceAmount}
                    onChange={(e) => setFormIosPriceAmount(e.target.value)}
                    placeholder="9.99"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">{t("eurPrice")}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                    value={formEurPriceAmount}
                    onChange={(e) => setFormEurPriceAmount(e.target.value)}
                    placeholder="6.49"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">{t("eurIosPrice")}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                    value={formEurIosPriceAmount}
                    onChange={(e) => setFormEurIosPriceAmount(e.target.value)}
                    placeholder="9.49"
                  />
                </div>
              </div>

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
                    <th className="pb-2">Usual</th>
                    <th className="pb-2">{t("appleProductId")}</th>
                    <th className="pb-2">{t("iosPrice")}</th>
                    <th className="pb-2">Multi-Currency</th>
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
                      <td className="py-2 text-text-secondary">
                        {editingProduct === product.id ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-24 rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary"
                            value={editFields.usualPrice}
                            onChange={(e) => setEditFields((f) => ({ ...f, usualPrice: e.target.value }))}
                            placeholder="0.00"
                          />
                        ) : (
                          product.usualPrice ? formatCents(product.usualPrice) : "\u2014"
                        )}
                      </td>
                      <td className="py-2 text-text-secondary">
                        {editingProduct === product.id ? (
                          <input
                            className="w-40 rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary"
                            value={editFields.appleProductId}
                            onChange={(e) => setEditFields((f) => ({ ...f, appleProductId: e.target.value }))}
                            placeholder="App Store Connect ID"
                          />
                        ) : (
                          <span className="text-xs">{product.appleProductId ?? "\u2014"}</span>
                        )}
                      </td>
                      <td className="py-2 text-text-secondary">
                        {editingProduct === product.id ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-24 rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary"
                            value={editFields.iosPriceAmount}
                            onChange={(e) => setEditFields((f) => ({ ...f, iosPriceAmount: e.target.value }))}
                            placeholder="0.00"
                          />
                        ) : (
                          product.iosPriceAmount ? formatCents(product.iosPriceAmount) : "\u2014"
                        )}
                      </td>
                      <td className="py-2">
                        {editPriceProductId === product.id ? (
                          <div className="space-y-2 min-w-[200px]">
                            {priceEntries.map((entry, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <select
                                  className="w-16 rounded border border-border bg-surface px-1 py-1 text-xs text-text-primary"
                                  value={entry.currencyId}
                                  onChange={(e) => {
                                    const updated = [...priceEntries];
                                    updated[idx] = { ...updated[idx], currencyId: e.target.value };
                                    setPriceEntries(updated);
                                  }}
                                >
                                  {currencies.filter((c) => c.active).map((c) => (
                                    <option key={c.id} value={c.id}>{c.id}</option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-16 rounded border border-border bg-surface px-1 py-1 text-xs text-text-primary"
                                  value={entry.amount}
                                  onChange={(e) => {
                                    const updated = [...priceEntries];
                                    updated[idx] = { ...updated[idx], amount: e.target.value };
                                    setPriceEntries(updated);
                                  }}
                                  placeholder="6.99"
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-16 rounded border border-border bg-surface px-1 py-1 text-xs text-text-primary"
                                  value={entry.iosAmount}
                                  onChange={(e) => {
                                    const updated = [...priceEntries];
                                    updated[idx] = { ...updated[idx], iosAmount: e.target.value };
                                    setPriceEntries(updated);
                                  }}
                                  placeholder="iOS"
                                />
                                <button onClick={() => removePriceEntry(idx)} className="text-xs text-danger-fg">&times;</button>
                              </div>
                            ))}
                            <div className="flex gap-1">
                              <button onClick={addPriceEntry} className="text-xs text-emerald-400 hover:underline">+ Add</button>
                              <Button variant="primary" size="sm" disabled={savingPrices} onClick={() => handleSavePrices(product.id)}>
                                {savingPrices ? "..." : "Save"}
                              </Button>
                              <button onClick={() => setEditPriceProductId(null)} className="text-xs text-text-tertiary hover:text-text-primary">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            {product.prices.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {product.prices.map((p) => (
                                  <Badge key={p.currencyId} variant="default" className="text-[10px]">
                                    {p.currency.symbol}{(p.amount / 100).toFixed(2)}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-text-tertiary">&mdash;</span>
                            )}
                            <button
                              onClick={() => startEditingPrices(product)}
                              className="ml-1 text-xs text-emerald-400 hover:underline whitespace-nowrap"
                            >
                              Edit
                            </button>
                          </div>
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

        {/* Currencies & Regions Section */}
        <Card variant="glass">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">Currencies & Region Mapping</h3>

          {currenciesLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Currency list */}
              <div>
                <h4 className="text-xs font-medium text-text-secondary mb-2">Currencies</h4>
                {currencies.length === 0 ? (
                  <p className="text-xs text-text-tertiary">No currencies configured. Add USD and EUR to get started.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {currencies.map((curr) => (
                      <div
                        key={curr.id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                          curr.active ? "border-border bg-surface-elevated" : "border-border-subtle bg-surface opacity-50"
                        }`}
                      >
                        <span className="font-semibold text-text-primary">{curr.symbol}</span>
                        <span className="text-text-secondary">{curr.id}</span>
                        <span className="text-xs text-text-tertiary">{curr.name}</span>
                        <span className="text-[10px] text-text-tertiary">({curr._count.productPrices} prices)</span>
                        <button
                          onClick={() => handleToggleCurrency(curr)}
                          className="text-xs text-text-tertiary hover:text-text-primary"
                        >
                          {curr.active ? "Disable" : "Enable"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add currency form */}
                <div className="flex items-end gap-2">
                  <div>
                    <label className="block text-[10px] text-text-tertiary mb-0.5">Code</label>
                    <input
                      className="w-16 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary uppercase"
                      value={newCurrencyId}
                      onChange={(e) => setNewCurrencyId(e.target.value.slice(0, 3))}
                      placeholder="EUR"
                      maxLength={3}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-tertiary mb-0.5">Name</label>
                    <input
                      className="w-28 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
                      value={newCurrencyName}
                      onChange={(e) => setNewCurrencyName(e.target.value)}
                      placeholder="Euro"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-tertiary mb-0.5">Symbol</label>
                    <input
                      className="w-12 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
                      value={newCurrencySymbol}
                      onChange={(e) => setNewCurrencySymbol(e.target.value)}
                      placeholder="€"
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={creatingCurrency || !newCurrencyId || !newCurrencyName || !newCurrencySymbol}
                    onClick={handleCreateCurrency}
                  >
                    {creatingCurrency ? "..." : "Add Currency"}
                  </Button>
                </div>
              </div>

              {/* Region → Currency mapping */}
              <div className="border-t border-border-subtle pt-4">
                <h4 className="text-xs font-medium text-text-secondary mb-2">Region → Currency Mapping</h4>
                {regionCurrencies.length === 0 ? (
                  <p className="text-xs text-text-tertiary mb-3">No mappings. Assign a default currency to each region.</p>
                ) : (
                  <div className="space-y-1 mb-3">
                    {regionCurrencies.map((rc) => (
                      <div key={rc.id} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-elevated px-3 py-2 text-sm">
                        <Badge variant="default">{rc.region}</Badge>
                        <span className="text-text-secondary">→</span>
                        <span className="font-semibold text-text-primary">{rc.currency.symbol} {rc.currency.id}</span>
                        <span className="text-xs text-text-tertiary">{rc.currency.name}</span>
                        {rc.isDefault && <Badge variant="accent" className="text-[10px]">Default</Badge>}
                        <button
                          onClick={() => handleDeleteRegionCurrency(rc.id)}
                          className="ml-auto text-xs text-danger-fg hover:text-danger-fg/80"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <div>
                    <label className="block text-[10px] text-text-tertiary mb-0.5">Region</label>
                    <select
                      className="w-28 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
                      value={newRcRegion}
                      onChange={(e) => setNewRcRegion(e.target.value as "GLOBAL" | "DE")}
                    >
                      <option value="GLOBAL">GLOBAL</option>
                      <option value="DE">DE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-tertiary mb-0.5">Currency</label>
                    <select
                      className="w-28 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
                      value={newRcCurrency}
                      onChange={(e) => setNewRcCurrency(e.target.value)}
                    >
                      <option value="">Select...</option>
                      {currencies.filter((c) => c.active).map((c) => (
                        <option key={c.id} value={c.id}>{c.symbol} {c.id}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={creatingRc || !newRcCurrency}
                    onClick={handleCreateRegionCurrency}
                  >
                    {creatingRc ? "..." : "Set Mapping"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Email Templates Section */}
        <Card variant="glass">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">{t("emailTemplates")}</h3>
          {emailTemplatesLoading ? (
            <p className="text-sm text-text-secondary">Loading templates...</p>
          ) : (
            <div className="space-y-2">
              {emailTemplates.map((tmpl) => (
                <div key={tmpl.slug}>
                  <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-text-primary">{tmpl.name}</div>
                      <div className="text-xs text-text-tertiary">Subject: {tmpl.subject}</div>
                      {testResult?.template === tmpl.slug && (
                        <div className={`mt-1 text-xs ${testResult.ok ? "text-success-fg" : "text-danger-fg"}`}>
                          {testResult.message}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => startEditingTemplate(tmpl)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePreview(tmpl.slug, tmpl.name)}
                      >
                        {t("preview")}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={sendingTest === tmpl.slug}
                        onClick={() => handleSendTest(tmpl.slug)}
                      >
                        {sendingTest === tmpl.slug ? "..." : t("sendTest")}
                      </Button>
                    </div>
                  </div>

                  {/* Inline editor */}
                  {editingTemplate === tmpl.slug && (
                    <div className="mt-2 rounded-lg border border-emerald-300/30 bg-surface-elevated p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">Subject</label>
                        <input
                          type="text"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-text-primary"
                        />
                      </div>

                      {/* Toolbar */}
                      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface p-2">
                        <button type="button" onClick={() => execCommand("bold")} className="rounded px-2 py-1 text-xs font-bold text-text-primary hover:bg-surface-elevated" title="Bold">B</button>
                        <button type="button" onClick={() => execCommand("italic")} className="rounded px-2 py-1 text-xs italic text-text-primary hover:bg-surface-elevated" title="Italic">I</button>
                        <button type="button" onClick={() => execCommand("underline")} className="rounded px-2 py-1 text-xs underline text-text-primary hover:bg-surface-elevated" title="Underline">U</button>
                        <span className="mx-1 h-4 w-px bg-border" />
                        <button type="button" onClick={() => execCommand("fontSize", "2")} className="rounded px-2 py-1 text-[10px] text-text-primary hover:bg-surface-elevated" title="Small">S</button>
                        <button type="button" onClick={() => execCommand("fontSize", "3")} className="rounded px-2 py-1 text-xs text-text-primary hover:bg-surface-elevated" title="Normal">N</button>
                        <button type="button" onClick={() => execCommand("fontSize", "5")} className="rounded px-2 py-1 text-sm text-text-primary hover:bg-surface-elevated" title="Large">L</button>
                        <span className="mx-1 h-4 w-px bg-border" />
                        <input
                          type="color"
                          defaultValue="#a3a3a3"
                          onChange={(e) => execCommand("foreColor", e.target.value)}
                          className="h-6 w-6 cursor-pointer rounded border-none bg-transparent"
                          title="Text color"
                        />
                        <span className="mx-1 h-4 w-px bg-border" />
                        <button type="button" onClick={() => execCommand("justifyLeft")} className="rounded px-2 py-1 text-xs text-text-primary hover:bg-surface-elevated" title="Align left">&#8676;</button>
                        <button type="button" onClick={() => execCommand("justifyCenter")} className="rounded px-2 py-1 text-xs text-text-primary hover:bg-surface-elevated" title="Align center">&#8596;</button>
                        <button type="button" onClick={() => execCommand("justifyRight")} className="rounded px-2 py-1 text-xs text-text-primary hover:bg-surface-elevated" title="Align right">&#8677;</button>
                        <span className="mx-1 h-4 w-px bg-border" />
                        <button
                          type="button"
                          onClick={() => {
                            const url = prompt("Enter URL:");
                            if (url) execCommand("createLink", url);
                          }}
                          className="rounded px-2 py-1 text-xs text-text-primary hover:bg-surface-elevated"
                          title="Insert link"
                        >
                          Link
                        </button>
                        <button type="button" onClick={insertCtaButton} className="rounded px-2 py-1 text-xs text-emerald-400 hover:bg-surface-elevated" title="Insert CTA button">CTA</button>
                        <span className="mx-1 h-4 w-px bg-border" />
                        <select
                          onChange={(e) => { if (e.target.value) { insertPlaceholder(e.target.value); e.target.value = ""; } }}
                          className="rounded border border-border bg-input-bg px-2 py-1 text-xs text-text-primary"
                          defaultValue=""
                        >
                          <option value="" disabled>Placeholder...</option>
                          {(templatePlaceholders[tmpl.slug] ?? []).map((p) => (
                            <option key={p} value={p}>{`{{${p}}}`}</option>
                          ))}
                        </select>
                      </div>

                      {/* Contenteditable editor */}
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        dangerouslySetInnerHTML={{ __html: editBody }}
                        onBlur={(e) => setEditBody(e.currentTarget.innerHTML)}
                        className="min-h-[200px] rounded-lg border border-border bg-white p-4 text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
                      />

                      {/* Live preview */}
                      <details className="rounded-lg border border-border">
                        <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-text-secondary">Live Preview</summary>
                        <iframe
                          srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#e5e5e5;margin:0;padding:0}.container{max-width:560px;margin:0 auto;padding:40px 20px}.logo{font-size:24px;font-weight:700;color:#fff;text-align:center;margin-bottom:32px}.card{background:#171717;border:1px solid #262626;border-radius:12px;padding:32px}h1{color:#fff;font-size:20px;margin:0 0 16px}p{color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 16px}.btn{display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px}.footer{text-align:center;margin-top:32px;font-size:12px;color:#525252}</style></head><body><div class="container"><div class="logo">Bonistock</div><div class="card">${editBody}</div><div class="footer"><p>Bonistock — Upside-first Stock & ETF Advisor</p></div></div></body></html>`}
                          className="w-full rounded"
                          style={{ minHeight: 400, border: "none" }}
                          title="Template preview"
                          sandbox="allow-same-origin"
                        />
                      </details>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={savingTemplate}
                          onClick={handleSaveTemplate}
                        >
                          {savingTemplate ? "Saving..." : "Save"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelEditingTemplate}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Email Preview Modal */}
        {previewHtml && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-bg backdrop-blur-sm">
            <div className="relative mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-surface-elevated">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h4 className="text-sm font-semibold text-text-primary">{previewName}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setPreviewHtml(null); setPreviewName(null); }}
                >
                  {t("close")}
                </Button>
              </div>
              <div className="overflow-y-auto p-1" style={{ maxHeight: "calc(80vh - 56px)" }}>
                <iframe
                  srcDoc={previewHtml}
                  className="w-full rounded"
                  style={{ minHeight: 500, border: "none" }}
                  title="Email preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        )}

        {/* System Health & Breakdowns */}
        <div className="grid gap-4 lg:grid-cols-2">
          {stats ? (
            <>
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
            </>
          ) : (
            <Card variant="glass" className="lg:col-span-2 text-center py-4">
              <p className="text-sm text-text-tertiary">
                {fetching ? t("refreshing") : t("statsError")}
              </p>
            </Card>
          )}
        </div>

        {/* Recent Activity / Audit Log */}
        <Card variant="glass">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">{t("recentActivity")}</h3>
          {!stats ? (
            <p className="text-sm text-text-tertiary">
              {fetching ? t("refreshing") : t("statsError")}
            </p>
          ) : stats.recentActivity.length === 0 ? (
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
      </div>
  );
}
