"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";

interface ActiveVoucher {
  code: string;
  discountType: "PERCENT" | "FIXED_AMOUNT" | "FREE_PASS";
  discountPct: number | null;
  discountFixed: number | null;
  passDays: number | null;
  description: string | null;
  validUntil: string | null;
  maxUses: number | null;
  useCount: number;
}

function discountText(v: ActiveVoucher): string {
  if (v.description) return v.description;
  if (v.discountType === "PERCENT" && v.discountPct)
    return `Save ${v.discountPct}% on any plan`;
  if (v.discountType === "FIXED_AMOUNT" && v.discountFixed)
    return `Save $${(v.discountFixed / 100).toFixed(0)} on any plan`;
  if (v.discountType === "FREE_PASS" && v.passDays)
    return `Get a ${v.passDays}-day free pass`;
  return "Special offer available";
}

function expiryText(validUntil: string | null): string | null {
  if (!validUntil) return null;
  const msLeft = new Date(validUntil).getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / 86_400_000);
  if (daysLeft <= 0) return null;
  if (daysLeft === 1) return "Last chance — ends today";
  if (daysLeft <= 7) return `${daysLeft} days left`;
  return `Ends ${new Date(validUntil).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function PromoBanner() {
  const [voucher, setVoucher] = useState<ActiveVoucher | null>(null);
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/vouchers/active")
      .then((r) => r.json())
      .then((data: ActiveVoucher | null) => {
        if (!data) return;
        const key = `promo_dismissed_${data.code}`;
        if (sessionStorage.getItem(key)) return;
        setVoucher(data);
        setDismissed(false);
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    if (voucher) sessionStorage.setItem(`promo_dismissed_${voucher.code}`, "1");
    setDismissed(true);
  };

  const handleCopy = () => {
    if (!voucher) return;
    navigator.clipboard.writeText(voucher.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (dismissed || !voucher) return null;

  const expiry = expiryText(voucher.validUntil);
  const isUrgent = voucher.validUntil
    ? Math.ceil((new Date(voucher.validUntil).getTime() - Date.now()) / 86_400_000) <= 3
    : false;

  return (
    <div className="relative z-50 bg-accent text-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        {/* Left: message */}
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
          <span className="shrink-0">🎉</span>
          <span className="truncate">
            {discountText(voucher)}
          </span>
          {expiry && (
            <span className={`hidden shrink-0 text-xs sm:inline ${isUrgent ? "font-bold" : "opacity-75"}`}>
              · {expiry}
            </span>
          )}
        </div>

        {/* Centre: code + copy */}
        <button
          onClick={handleCopy}
          title="Click to copy"
          className="group flex shrink-0 items-center gap-1.5 rounded-md border border-background/30 bg-background/15 px-2.5 py-1 text-xs font-bold transition-all hover:bg-background/25"
        >
          <span className="font-mono tracking-wider">{voucher.code}</span>
          <span className="text-background/60 group-hover:text-background/90 transition-colors text-[10px]">
            {copied ? "✓ copied" : "copy"}
          </span>
        </button>

        {/* Right: CTA + close */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/pricing"
            className="hidden rounded-md bg-background/15 px-3 py-1 text-xs font-semibold transition-all hover:bg-background/25 sm:block"
          >
            See plans →
          </Link>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="flex h-6 w-6 items-center justify-center rounded-full text-background/70 transition-colors hover:bg-background/20 hover:text-background"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
