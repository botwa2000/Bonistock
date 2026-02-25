"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { faqItems as defaultItems } from "@/lib/mock-data";
import type { FaqItem } from "@/lib/types";

interface FaqSectionProps {
  items?: FaqItem[];
  limit?: number;
}

export function FaqSection({ items, limit }: FaqSectionProps) {
  const t = useTranslations("faq");
  const [open, setOpen] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const faqList = items ?? defaultItems;

  const categories = limit
    ? null
    : (t.raw("categories") as Record<string, string>);

  const filtered = limit
    ? faqList.slice(0, limit)
    : faqList.filter((item) => {
        const matchesCategory =
          activeCategory === "all" || item.category === activeCategory;
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          !query ||
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
      });

  return (
    <div className="mx-auto max-w-3xl">
      {/* Search + category tabs (hidden when limit is set, e.g. landing page) */}
      {!limit && (
        <div className="mb-6 space-y-4">
          {/* Search input */}
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setOpen(null);
              }}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-xl border border-border-subtle bg-surface py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
            />
          </div>

          {/* Category tabs */}
          {categories && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(categories).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveCategory(key);
                    setOpen(null);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeCategory === key
                      ? "bg-emerald-400/20 text-accent-fg border border-emerald-400/30"
                      : "bg-surface border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAQ accordion */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">
            {t("noResults")}
          </p>
        ) : (
          filtered.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border-subtle bg-surface backdrop-blur"
            >
              <button
                className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-text-primary"
                onClick={() => setOpen(open === idx ? null : idx)}
              >
                {item.question}
                <span className="ml-2 text-text-secondary">
                  {open === idx ? "\u2212" : "+"}
                </span>
              </button>
              {open === idx && (
                <div className="border-t border-border-subtle px-5 py-4 text-sm text-text-secondary">
                  {item.answer}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
