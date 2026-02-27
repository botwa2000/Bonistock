"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const regions = [
  { code: "GLOBAL", label: "Global", icon: "G" },
  { code: "DE", label: "Deutschland", icon: "DE" },
] as const;

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(getRegionCookie());
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

  const currentRegion = regions.find((r) => r.code === current) ?? regions[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-1 rounded-lg px-1.5 text-text-secondary hover:bg-surface hover:text-text-primary transition-colors text-xs font-medium"
        aria-label="Change region"
        title="Change region"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="hidden sm:inline">{currentRegion.icon}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border border-border bg-surface-elevated shadow-lg overflow-hidden">
          {regions.map((region) => (
            <button
              key={region.code}
              onClick={() => handleSelect(region.code)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                region.code === current
                  ? "bg-surface text-text-primary"
                  : "text-text-secondary hover:bg-surface hover:text-text-primary"
              }`}
            >
              <span className="text-xs font-semibold w-8">{region.icon}</span>
              <span>{region.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
