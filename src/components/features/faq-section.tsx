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
          className="rounded-xl border border-white/5 bg-white/5 backdrop-blur"
        >
          <button
            className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-white"
            onClick={() => setOpen(open === idx ? null : idx)}
          >
            {item.question}
            <span className="ml-2 text-white/60">
              {open === idx ? "\u2212" : "+"}
            </span>
          </button>
          {open === idx && (
            <div className="border-t border-white/5 px-5 py-4 text-sm text-white/70">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
