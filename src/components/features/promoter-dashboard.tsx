"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromoterProfile {
  promoter: {
    id: string;
    refCode: string;
    tierId: string;
    tierName: string;
    commissionPct: number;
    totalEarnings: number;
    pendingEarnings: number;
    monthlyLimit: number;
    usedThisMonth: number;
  };
  stats: {
    totalVouchers: number;
    usedVouchers: number;
    totalReferrals: number;
    pendingCommissions: number;
    settledCommissions: number;
  };
}

interface Voucher {
  id: string;
  code: string;
  type: string;
  discountType: string;
  discountPct: number | null;
  discountFixed: number | null;
  passDays: number | null;
  description: string | null;
  validUntil: string | null;
  maxUses: number | null;
  useCount: number;
  active: boolean;
  createdAt: string;
  _count?: { redemptions: number };
  redemptionCount?: number;
}

interface Commission {
  id: string;
  amount: number;
  currency: string;
  pct: number;
  status: string;
  createdAt: string;
  settledAt: string | null;
  userEmail: string;
  userName: string | null;
}

interface CommissionTotals {
  totalEarned: number;
  pendingAmount: number;
  settledAmount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDiscount(voucher: Voucher): string {
  switch (voucher.discountType) {
    case "PERCENT":
      return voucher.discountPct != null ? `${voucher.discountPct}% off` : "Discount";
    case "FIXED_AMOUNT":
      return voucher.discountFixed != null ? `$${(voucher.discountFixed / 100).toFixed(2)} off` : "Discount";
    case "FREE_PASS":
      return voucher.passDays != null ? `${voucher.passDays}-day pass` : "Free pass";
    default:
      return voucher.discountType;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 rounded px-2 py-0.5 text-xs border border-border text-text-tertiary hover:text-text-primary hover:border-border transition-colors"
      title="Copy to clipboard"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PromoterDashboard() {
  const locale = useLocale();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const [profile, setProfile] = useState<PromoterProfile | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [totals, setTotals] = useState<CommissionTotals>({
    totalEarned: 0,
    pendingAmount: 0,
    settledAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [newVoucherCode, setNewVoucherCode] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, vouchersRes, commissionsRes] = await Promise.all([
        fetch("/api/promoter/profile"),
        fetch("/api/promoter/vouchers"),
        fetch("/api/promoter/commissions"),
      ]);

      if (profileRes.status === 403) {
        setError("You are not registered as a promoter.");
        setLoading(false);
        return;
      }
      if (!profileRes.ok || !vouchersRes.ok || !commissionsRes.ok) {
        setError("Failed to load promoter data.");
        setLoading(false);
        return;
      }

      const [profileData, vouchersData, commissionsData] = await Promise.all([
        profileRes.json(),
        vouchersRes.json(),
        commissionsRes.json(),
      ]);

      setProfile(profileData);
      setVouchers(vouchersData.vouchers ?? []);
      setCommissions(commissionsData.commissions ?? []);
      setTotals(
        commissionsData.totals ?? { totalEarned: 0, pendingAmount: 0, settledAmount: 0 }
      );
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleGenerateVoucher = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);
    setNewVoucherCode(null);
    try {
      const res = await fetch("/api/promoter/vouchers", { method: "POST" });
      if (res.status === 429) {
        setGenerateError("Monthly voucher limit reached.");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setGenerateError(body.error ?? "Failed to generate voucher.");
        return;
      }
      const data = await res.json();
      const code: string = data.voucher?.code ?? "";
      setNewVoucherCode(code);
      // Refresh voucher list and profile quota
      const [vouchersRes, profileRes] = await Promise.all([
        fetch("/api/promoter/vouchers"),
        fetch("/api/promoter/profile"),
      ]);
      if (vouchersRes.ok) setVouchers((await vouchersRes.json()).vouchers ?? []);
      if (profileRes.ok) setProfile(await profileRes.json());
    } catch {
      setGenerateError("An unexpected error occurred.");
    } finally {
      setGenerating(false);
    }
  }, []);

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent-fg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Card variant="glass" className="max-w-sm text-center">
          <p className="text-danger-fg">{error}</p>
        </Card>
      </div>
    );
  }

  if (!profile) return null;

  const { promoter, stats } = profile;
  const referralLink = `${appUrl}/${locale}/ref/${promoter.refCode}`;
  const atLimit =
    promoter.monthlyLimit !== -1 && promoter.usedThisMonth >= promoter.monthlyLimit;

  const quotaLabel =
    promoter.monthlyLimit === -1
      ? "Unlimited"
      : `${promoter.usedThisMonth} / ${promoter.monthlyLimit} used this month`;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-text-primary">Promoter Dashboard</h1>
        <Badge variant="accent">{promoter.tierName}</Badge>
      </div>

      {/* ── Stats row ── */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {[
          { label: "Total Referrals", value: String(stats.totalReferrals) },
          { label: "Vouchers Used", value: `${stats.usedVouchers} / ${stats.totalVouchers}` },
          {
            label: "Pending Earnings",
            value: formatMoney(promoter.pendingEarnings),
          },
          {
            label: "Total Earned",
            value: formatMoney(promoter.totalEarnings),
          },
        ].map((stat) => (
          <Card key={stat.label} variant="glass">
            <div className="text-xs uppercase tracking-wide text-text-secondary">
              {stat.label}
            </div>
            <div className="mt-1 text-2xl font-semibold text-text-primary">
              {stat.value}
            </div>
          </Card>
        ))}
      </div>

      {/* ── Referral link ── */}
      <Card variant="glass">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Your Referral Link</h2>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-input-bg px-3 py-2">
          <span className="flex-1 truncate font-mono text-sm text-text-primary">
            {referralLink}
          </span>
          <CopyButton text={referralLink} />
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          Share this link. Anyone who signs up via your link is attributed to you.
        </p>
      </Card>

      {/* ── Voucher generator ── */}
      <Card variant="glass">
        <h2 className="mb-1 text-sm font-semibold text-text-primary">Generate Voucher</h2>
        <p className="mb-3 text-xs text-text-secondary">
          {quotaLabel} &mdash; Generate a {promoter.tierName} tier voucher
        </p>

        <Button
          variant="primary"
          size="sm"
          disabled={atLimit || generating}
          onClick={handleGenerateVoucher}
        >
          {generating ? "Generating..." : "Generate Voucher"}
        </Button>

        {generateError && (
          <p className="mt-2 text-xs text-danger-fg">{generateError}</p>
        )}

        {newVoucherCode && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-elevated px-3 py-2">
            <span className="text-xs text-text-secondary">New code:</span>
            <span className="font-mono text-sm font-semibold text-accent-fg">
              {newVoucherCode}
            </span>
            <CopyButton text={newVoucherCode} />
          </div>
        )}
      </Card>

      {/* ── Vouchers table ── */}
      <Card variant="glass" padding="none">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">Your Vouchers</h2>
        </div>

        {vouchers.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-secondary">
            No vouchers generated yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase text-text-tertiary">
                  <th className="px-4 py-2 font-medium">Code</th>
                  <th className="px-4 py-2 font-medium">Discount</th>
                  <th className="px-4 py-2 font-medium text-right">Uses</th>
                  <th className="px-4 py-2 font-medium">Expires</th>
                  <th className="px-4 py-2 font-medium">Active</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-border-subtle last:border-0 hover:bg-surface transition-colors"
                  >
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-1">
                        <span className="font-mono text-text-primary">{v.code}</span>
                        <CopyButton text={v.code} />
                      </span>
                    </td>
                    <td className="px-4 py-2 text-text-secondary">{formatDiscount(v)}</td>
                    <td className="px-4 py-2 text-right text-text-secondary">
                      {v.useCount}
                      {v.maxUses != null ? ` / ${v.maxUses}` : ""}
                    </td>
                    <td className="px-4 py-2 text-text-secondary">
                      {v.validUntil ? formatDate(v.validUntil) : <span className="text-text-tertiary">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      {v.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-text-secondary">{formatDate(v.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Commissions table ── */}
      <Card variant="glass" padding="none">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">Commissions</h2>
        </div>

        {commissions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-secondary">
            No commissions yet. Share your referral link!
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-xs uppercase text-text-tertiary">
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">User</th>
                    <th className="px-4 py-2 font-medium text-right">Amount</th>
                    <th className="px-4 py-2 font-medium text-right">%</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border-subtle last:border-0 hover:bg-surface transition-colors"
                    >
                      <td className="px-4 py-2 text-text-secondary">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-2 text-text-primary">
                        {c.userName ? (
                          <span>
                            {c.userName}{" "}
                            <span className="text-text-tertiary text-xs">({c.userEmail})</span>
                          </span>
                        ) : (
                          c.userEmail
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-text-primary">
                        {formatMoney(c.amount)}
                      </td>
                      <td className="px-4 py-2 text-right text-text-secondary">{c.pct}%</td>
                      <td className="px-4 py-2">
                        {c.status === "PENDING" && <Badge variant="warning">Pending</Badge>}
                        {c.status === "SETTLED" && <Badge variant="success">Settled</Badge>}
                        {c.status === "CANCELLED" && <Badge variant="danger">Cancelled</Badge>}
                        {c.status !== "PENDING" &&
                          c.status !== "SETTLED" &&
                          c.status !== "CANCELLED" && (
                            <Badge variant="default">{c.status}</Badge>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals footer */}
            <div className="flex flex-wrap gap-4 border-t border-border-subtle px-4 py-3 text-xs text-text-secondary">
              <span>
                Pending:{" "}
                <span className="font-semibold text-warning-fg">
                  {formatMoney(totals.pendingAmount)}
                </span>
              </span>
              <span>
                Settled:{" "}
                <span className="font-semibold text-success-fg">
                  {formatMoney(totals.settledAmount)}
                </span>
              </span>
              <span>
                Total Earned:{" "}
                <span className="font-semibold text-text-primary">
                  {formatMoney(totals.totalEarned)}
                </span>
              </span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
