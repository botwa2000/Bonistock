"use client";

import { useState, useEffect, useCallback } from "react";

interface WatchlistEntry {
  symbol: string;
  name: string | null;
  price: number | null;
  upside: number | null;
  addedAt: string;
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistEntry[]>([]);
  const [symbols, setSymbols] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/user/watchlist");
      if (!res.ok) { setLoading(false); return; }
      const data: WatchlistEntry[] = await res.json();
      setItems(data);
      setSymbols(new Set(data.map((i) => i.symbol)));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const toggle = useCallback(async (symbol: string) => {
    if (symbols.has(symbol)) {
      // Remove
      setSymbols((prev) => { const next = new Set(prev); next.delete(symbol); return next; });
      setItems((prev) => prev.filter((i) => i.symbol !== symbol));
      await fetch(`/api/user/watchlist?symbol=${encodeURIComponent(symbol)}`, { method: "DELETE" });
    } else {
      // Add
      setSymbols((prev) => new Set(prev).add(symbol));
      await fetch("/api/user/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      await fetchItems(); // re-fetch to get enriched data
    }
  }, [symbols, fetchItems]);

  const isWatchlisted = useCallback((symbol: string) => symbols.has(symbol), [symbols]);

  return { items, loading, toggle, isWatchlisted, refetch: fetchItems };
}
