"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
    commissionPct: string | number;
    totalEarnings: string | number;
    pendingEarnings: string | number;
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
  discountPct: string | number | null;
  discountFixed: number | null;
  passDays: number | null;
  description: string | null;
  validUntil: string | null;
  maxUses: number | null;
  useCount: number;
  active: boolean;
  createdAt: string;
  redemptionCount?: number;
}

interface Commission {
  id: string;
  amount: number;
  currency: string;
  pct: string | number;
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

interface Referral {
  id: string;
  email: string;
  name: string | null;
  tier: string;
  subscriptionStatus: string | null;
  joinedAt: string;
  totalCommission: number;
}

type Tab = "overview" | "vouchers" | "referrals" | "earnings" | "account";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(cents: string | number): string {
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

function formatDiscount(voucher: Voucher): string {
  switch (voucher.discountType) {
    case "PERCENT":
      return voucher.discountPct != null ? `${Number(voucher.discountPct)}% off` : "% Discount";
    case "FIXED_AMOUNT":
      return voucher.discountFixed != null
        ? `$${(voucher.discountFixed / 100).toFixed(2)} off`
        : "$ Discount";
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

function tierBadgeVariant(tier: string): "accent" | "warning" | "success" | "default" {
  const t = tier.toLowerCase();
  if (t === "plus") return "accent";
  if (t === "pass") return "warning";
  if (t === "free") return "default";
  return "default";
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
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
      className="shrink-0 rounded px-2.5 py-1 text-xs border border-border text-text-tertiary hover:text-text-primary hover:border-border transition-colors"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
        active
          ? "border-accent-fg text-text-primary"
          : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card variant="glass">
      <div className="text-xs uppercase tracking-wide text-text-tertiary">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-text-primary">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-text-secondary">{sub}</div>}
    </Card>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  profile,
  referralLink,
}: {
  profile: PromoterProfile;
  referralLink: string;
}) {
  const { promoter, stats } = profile;

  const quotaLabel =
    promoter.monthlyLimit === -1
      ? "Unlimited / month"
      : `${promoter.usedThisMonth} of ${promoter.monthlyLimit} used this month`;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Total Referrals" value={String(stats.totalReferrals)} />
        <StatCard
          label="Vouchers"
          value={`${stats.usedVouchers} / ${stats.totalVouchers}`}
          sub="redeemed / issued"
        />
        <StatCard
          label="Pending Earnings"
          value={formatMoney(promoter.pendingEarnings)}
          sub={stats.pendingCommissions > 0 ? `${stats.pendingCommissions} unsettled` : undefined}
        />
        <StatCard
          label="Total Earned"
          value={formatMoney(promoter.totalEarnings)}
          sub={`${stats.settledCommissions} commissions settled`}
        />
      </div>

      {/* Referral link + Tier */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Referral link */}
        <Card variant="glass">
          <h2 className="mb-1 text-sm font-semibold text-text-primary">Your Referral Link</h2>
          <p className="mb-3 text-xs text-text-secondary">
            Anyone who signs up via this link is attributed to you automatically.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-input-bg px-3 py-2">
            <span className="flex-1 truncate font-mono text-xs text-text-primary">{referralLink}</span>
            <CopyButton text={referralLink} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-text-secondary">Ref code:</span>
            <span className="rounded bg-surface px-2 py-0.5 font-mono text-sm font-bold tracking-widest text-accent-fg">
              {promoter.refCode}
            </span>
            <CopyButton text={promoter.refCode} label="Copy code" />
          </div>
        </Card>

        {/* Tier info */}
        <Card variant="glass">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-primary">Promoter Tier</h2>
            <Badge variant="accent">{promoter.tierName}</Badge>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-text-secondary">Commission rate</span>
              <span className="font-semibold text-text-primary">
                {Number(promoter.commissionPct)}%
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-text-secondary">Monthly vouchers</span>
              <span className="font-semibold text-text-primary">
                {promoter.monthlyLimit === -1 ? "Unlimited" : promoter.monthlyLimit}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-text-secondary">Used this month</span>
              <span className="font-semibold text-text-primary">{quotaLabel.split(" ")[0]}</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

// ─── Vouchers Tab ─────────────────────────────────────────────────────────────

function VouchersTab({ profile, vouchers, onGenerated }: {
  profile: PromoterProfile;
  vouchers: Voucher[];
  onGenerated: (code: string, updatedVouchers: Voucher[], updatedProfile: PromoterProfile) => void;
}) {
  const { promoter } = profile;
  const [generating, setGenerating] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const atLimit =
    promoter.monthlyLimit !== -1 && promoter.usedThisMonth >= promoter.monthlyLimit;

  const quotaLabel =
    promoter.monthlyLimit === -1
      ? "Unlimited vouchers / month"
      : `${promoter.usedThisMonth} of ${promoter.monthlyLimit} used this month`;

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setNewCode(null);
    try {
      const res = await fetch("/api/promoter/vouchers", { method: "POST" });
      if (res.status === 429) {
        setError("Monthly voucher limit reached.");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to generate voucher.");
        return;
      }
      const data = await res.json();
      const code: string = data.voucher?.code ?? "";
      setNewCode(code);

      const [vRes, pRes] = await Promise.all([
        fetch("/api/promoter/vouchers"),
        fetch("/api/promoter/profile"),
      ]);
      const updatedVouchers = vRes.ok ? (await vRes.json()).vouchers ?? [] : vouchers;
      const updatedProfile = pRes.ok ? await pRes.json() : profile;
      onGenerated(code, updatedVouchers, updatedProfile);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generator */}
      <Card variant="glass">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="mb-1 text-sm font-semibold text-text-primary">Generate Voucher</h2>
            <p className="text-xs text-text-secondary">{quotaLabel}</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={atLimit || generating}
            onClick={handleGenerate}
          >
            {generating ? "Generating..." : atLimit ? "Limit reached" : "Generate Voucher"}
          </Button>
        </div>

        {error && <p className="mt-3 text-xs text-danger-fg">{error}</p>}

        {newCode && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3">
            <span className="text-xs text-text-secondary">New voucher code:</span>
            <span className="font-mono text-base font-bold tracking-widest text-accent-fg">
              {newCode}
            </span>
            <CopyButton text={newCode} />
          </div>
        )}
      </Card>

      {/* Vouchers table */}
      <Card variant="glass" padding="none">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Your Vouchers
            {vouchers.length > 0 && (
              <span className="ml-2 text-xs font-normal text-text-tertiary">
                ({vouchers.length})
              </span>
            )}
          </h2>
        </div>

        {vouchers.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-text-secondary">
            No vouchers yet — generate your first one above.
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
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-border-subtle last:border-0 hover:bg-surface transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-text-primary">{v.code}</span>
                        <CopyButton text={v.code} />
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">{formatDiscount(v)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-secondary">
                      {v.useCount}
                      {v.maxUses != null ? ` / ${v.maxUses}` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {v.validUntil ? (
                        formatDate(v.validUntil)
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {v.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-text-tertiary text-xs">
                      {formatDate(v.createdAt)}
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

// ─── Referrals Tab ────────────────────────────────────────────────────────────

function ReferralsTab({ referrals, loading }: { referrals: Referral[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent-fg" />
      </div>
    );
  }

  return (
    <Card variant="glass" padding="none">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">
          Referred Users
          {referrals.length > 0 && (
            <span className="ml-2 text-xs font-normal text-text-tertiary">
              ({referrals.length})
            </span>
          )}
        </h2>
      </div>

      {referrals.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-text-secondary">No referrals yet.</p>
          <p className="mt-1 text-xs text-text-tertiary">
            Share your referral link and voucher codes to start earning commissions.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase text-text-tertiary">
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                <th className="px-4 py-2 font-medium text-right">Commission</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border-subtle last:border-0 hover:bg-surface transition-colors"
                >
                  <td className="px-4 py-2.5">
                    {r.name ? (
                      <div>
                        <div className="text-text-primary">{r.name}</div>
                        <div className="text-xs text-text-tertiary">{r.email}</div>
                      </div>
                    ) : (
                      <div className="text-text-primary">{r.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={tierBadgeVariant(r.tier)}>
                      {r.tier}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary text-xs">
                    {formatDate(r.joinedAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-primary">
                    {r.totalCommission > 0 ? formatMoney(r.totalCommission) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Earnings Tab ─────────────────────────────────────────────────────────────

function EarningsTab({
  commissions,
  totals,
}: {
  commissions: Commission[];
  totals: CommissionTotals;
}) {
  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid gap-3 grid-cols-3">
        <Card variant="glass">
          <div className="text-xs uppercase tracking-wide text-text-tertiary">Pending</div>
          <div className="mt-1 text-xl font-semibold text-warning-fg">
            {formatMoney(totals.pendingAmount)}
          </div>
          <div className="mt-0.5 text-xs text-text-tertiary">awaiting settlement</div>
        </Card>
        <Card variant="glass">
          <div className="text-xs uppercase tracking-wide text-text-tertiary">Settled</div>
          <div className="mt-1 text-xl font-semibold text-success-fg">
            {formatMoney(totals.settledAmount)}
          </div>
          <div className="mt-0.5 text-xs text-text-tertiary">paid out</div>
        </Card>
        <Card variant="glass">
          <div className="text-xs uppercase tracking-wide text-text-tertiary">Total Earned</div>
          <div className="mt-1 text-xl font-semibold text-text-primary">
            {formatMoney(totals.totalEarned)}
          </div>
          <div className="mt-0.5 text-xs text-text-tertiary">all time</div>
        </Card>
      </div>

      {/* Commissions table */}
      <Card variant="glass" padding="none">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Commission History
            {commissions.length > 0 && (
              <span className="ml-2 text-xs font-normal text-text-tertiary">
                (last {commissions.length})
              </span>
            )}
          </h2>
        </div>

        {commissions.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-text-secondary">No commissions yet.</p>
            <p className="mt-1 text-xs text-text-tertiary">
              Commissions are earned when referred users subscribe.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase text-text-tertiary">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium text-right">Rate</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border-subtle last:border-0 hover:bg-surface transition-colors"
                  >
                    <td className="px-4 py-2.5 text-xs text-text-tertiary">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-text-primary">
                      {c.userName ? (
                        <span>
                          {c.userName}{" "}
                          <span className="text-xs text-text-tertiary">({c.userEmail})</span>
                        </span>
                      ) : (
                        c.userEmail
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-text-primary">
                      {formatMoney(c.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-text-secondary">
                      {Number(c.pct)}%
                    </td>
                    <td className="px-4 py-2.5">
                      {c.status === "PENDING" && <Badge variant="warning">Pending</Badge>}
                      {c.status === "SETTLED" && <Badge variant="success">Settled</Badge>}
                      {c.status === "CANCELLED" && <Badge variant="danger">Cancelled</Badge>}
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

// ─── Account Tab ──────────────────────────────────────────────────────────────

function AccountTab({ profile }: { profile: PromoterProfile }) {
  const router = useRouter();
  const { promoter, stats } = profile;

  const [leaving, setLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveBlocked, setLeaveBlocked] = useState(false);

  const hasPending = Number(promoter.pendingEarnings) > 0;

  const handleLeave = async () => {
    setLeaving(true);
    setLeaveError(null);
    try {
      const res = await fetch("/api/promoter/me", { method: "DELETE" });
      if (res.status === 409) {
        const body = await res.json();
        setLeaveBlocked(true);
        setLeaveError(body.message ?? "Cannot leave: commission history exists.");
        setConfirmLeave(false);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setLeaveError(body.error ?? "Failed to leave the program.");
        return;
      }
      // Success — go back to main dashboard
      router.push("/dashboard");
    } catch {
      setLeaveError("An unexpected error occurred.");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* Membership info */}
      <Card variant="glass">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Promoter Membership</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between">
            <span className="text-text-secondary">Tier</span>
            <Badge variant="accent">{promoter.tierName}</Badge>
          </li>
          <li className="flex justify-between">
            <span className="text-text-secondary">Ref code</span>
            <span className="font-mono font-bold tracking-widest text-text-primary">
              {promoter.refCode}
            </span>
          </li>
          <li className="flex justify-between">
            <span className="text-text-secondary">Commission rate</span>
            <span className="text-text-primary">{Number(promoter.commissionPct)}%</span>
          </li>
          <li className="flex justify-between">
            <span className="text-text-secondary">Total referrals</span>
            <span className="text-text-primary">{stats.totalReferrals}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-text-secondary">Total earned</span>
            <span className="text-text-primary">{formatMoney(promoter.totalEarnings)}</span>
          </li>
        </ul>
      </Card>

      {/* Leave program */}
      <Card variant="glass">
        <h2 className="mb-1 text-sm font-semibold text-text-primary">Leave Promoter Program</h2>
        <p className="mb-4 text-xs text-text-secondary">
          Leaving will deactivate your ref code and all your vouchers. Your account stays intact.
        </p>

        {leaveBlocked && leaveError && (
          <div className="mb-4 rounded-lg border border-border-subtle bg-surface p-3 text-xs text-warning-fg">
            {leaveError}
          </div>
        )}

        {hasPending && !leaveBlocked && (
          <div className="mb-4 rounded-lg border border-border-subtle bg-surface p-3 text-xs text-warning-fg">
            You have {formatMoney(promoter.pendingEarnings)} in pending earnings. These will be
            forfeited if you leave before they are settled. Contact support first if you want to
            receive your outstanding balance.
          </div>
        )}

        {!confirmLeave && !leaveBlocked && (
          <Button variant="ghost" size="sm" onClick={() => setConfirmLeave(true)}>
            Leave Program
          </Button>
        )}

        {confirmLeave && !leaveBlocked && (
          <div className="space-y-3">
            <p className="text-xs text-danger-fg font-medium">
              Are you sure? This cannot be undone without admin assistance.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                disabled={leaving}
                onClick={handleLeave}
              >
                {leaving ? "Leaving..." : "Yes, leave program"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={leaving}
                onClick={() => {
                  setConfirmLeave(false);
                  setLeaveError(null);
                }}
              >
                Cancel
              </Button>
            </div>
            {leaveError && !leaveBlocked && (
              <p className="text-xs text-danger-fg">{leaveError}</p>
            )}
          </div>
        )}
      </Card>

      {/* Delete account */}
      <Card variant="glass">
        <h2 className="mb-1 text-sm font-semibold text-text-primary">Delete Account</h2>
        <p className="mb-4 text-xs text-text-secondary">
          Permanently deletes your account, cancels any subscription, and removes all your data.
          This cannot be undone.
        </p>
        <a
          href="/settings"
          className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs text-danger-fg hover:border-danger-fg transition-colors"
        >
          Go to Settings → Delete Account
        </a>
      </Card>
    </div>
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
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [referralsFetched, setReferralsFetched] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Fetch referrals lazily when tab is opened
  const fetchReferrals = useCallback(async () => {
    setReferralsLoading(true);
    try {
      const res = await fetch("/api/promoter/referrals");
      if (res.ok) setReferrals((await res.json()).referrals ?? []);
    } catch {
      // silent
    } finally {
      setReferralsLoading(false);
      setReferralsFetched(true);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "referrals" && !referralsFetched && !referralsLoading) {
      fetchReferrals();
    }
  }, [activeTab, referralsFetched, referralsLoading, fetchReferrals]);

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

  const referralLink = `${appUrl}/${locale}/ref/${profile.promoter.refCode}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-text-primary">Promoter Dashboard</h1>
        <Badge variant="accent">{profile.promoter.tierName}</Badge>
        <span className="font-mono text-sm text-text-tertiary tracking-widest">
          #{profile.promoter.refCode}
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-subtle -mx-3 px-3 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 overflow-x-auto">
        <div className="flex min-w-max">
          {(
            [
              { key: "overview", label: "Overview" },
              { key: "vouchers", label: `Vouchers (${profile.stats.totalVouchers})` },
              { key: "referrals", label: `Referrals (${profile.stats.totalReferrals})` },
              { key: "earnings", label: "Earnings" },
              { key: "account", label: "Account" },
            ] as { key: Tab; label: string }[]
          ).map((tab) => (
            <TabButton
              key={tab.key}
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </TabButton>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab profile={profile} referralLink={referralLink} />
      )}
      {activeTab === "vouchers" && (
        <VouchersTab
          profile={profile}
          vouchers={vouchers}
          onGenerated={(code, updatedVouchers, updatedProfile) => {
            setVouchers(updatedVouchers);
            setProfile(updatedProfile);
          }}
        />
      )}
      {activeTab === "referrals" && (
        <ReferralsTab referrals={referrals} loading={referralsLoading} />
      )}
      {activeTab === "earnings" && (
        <EarningsTab commissions={commissions} totals={totals} />
      )}
      {activeTab === "account" && <AccountTab profile={profile} />}
    </div>
  );
}
