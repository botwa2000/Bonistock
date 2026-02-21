"use client";

import { useState } from "react";
import { faqItems } from "@/lib/mock-data";

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-2">
      {faqItems.map((item, idx) => (
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
      ))}
    </div>
  );
}
