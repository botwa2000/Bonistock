"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const REGION_META: Record<string, { label: string; flag: string }> = {
  GLOBAL: { label: "Global", flag: "\u{1F30D}" },
  DE: { label: "Germany", flag: "\u{1F1E9}\u{1F1EA}" },
};

interface RegionCurrencyInfo {
  region: string;
  currencyId: string;
  currency: { id: string; symbol: string };
}

function getRegionCookie(): string {
  const match = document.cookie.match(/(?:^|;\s*)NEXT_REGION=([^;]*)/);
  return match?.[1] ?? "GLOBAL";
}

function setRegionCookie(region: string) {
  document.cookie = `NEXT_REGION=${region}; path=/; max-age=31536000; SameSite=Lax`;
}

export function RegionSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("GLOBAL");
  const [regionCurrencies, setRegionCurrencies] = useState<RegionCurrencyInfo[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(getRegionCookie());
    fetch("/api/region-currencies")
      .then((r) => r.json())
      .then((data: RegionCurrencyInfo[]) => setRegionCurrencies(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (region: string) => {
    setRegionCookie(region);
    setCurrent(region);
    setOpen(false);

    // Try to persist to user settings if logged in
    fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region }),
    }).catch(() => {});

    router.refresh();
  };

  // Get currency for a region from DB mappings, fallback to USD
  const getCurrency = (region: string) => {
    const rc = regionCurrencies.find((r) => r.region === region);
    return rc?.currencyId ?? "USD";
  };

  const currentMeta = REGION_META[current] ?? REGION_META.GLOBAL;
  const currentCurrency = getCurrency(current);

  // Build the list of regions from REGION_META
  const regionList = Object.entries(REGION_META);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-1.5 rounded-lg px-1.5 text-text-secondary hover:bg-surface hover:text-text-primary transition-colors text-xs font-medium"
        aria-label="Change region"
        title="Change region"
      >
        <span className="text-base leading-none">{currentMeta.flag}</span>
        <span className="hidden sm:inline">{currentCurrency}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-xl border border-border bg-surface-elevated shadow-lg overflow-hidden">
          {regionList.map(([code, meta]) => (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                code === current
                  ? "bg-surface text-text-primary"
                  : "text-text-secondary hover:bg-surface hover:text-text-primary"
              }`}
            >
              <span className="text-base leading-none">{meta.flag}</span>
              <span>{meta.label}</span>
              <span className="ml-auto text-xs text-text-tertiary">{getCurrency(code)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
