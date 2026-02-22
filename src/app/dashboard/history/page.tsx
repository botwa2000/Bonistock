"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { UpgradePaywall } from "@/components/features/upgrade-paywall";
import { getRegionFlag, getSectorIcon } from "@/lib/stock-icons";

interface HistoryPick {
  symbol: string;
  name: string;
  price: number;
  target: number;
  upside: number;
  buys: number;
  holds: number;
  sells: number;
  analysts: number;
  sector: string;
  risk: string;
  region: string;
  marketCap: string;
  appearances: number;
}

interface DateGroup {
  date: string;
  picks: HistoryPick[];
}

interface RecurringStock {
  symbol: string;
  name: string;
  count: number;
  avgUpside: number;
}

interface HistoryResponse {
  dates: DateGroup[];
  totalDates: number;
  page: number;
  recurring: RecurringStock[];
}

export default function HistoryPage() {
  const t = useTranslations("history");
  const { user } = useAuth();
  const tier = user?.tier ?? "free";

  const [data, setData] = useState<HistoryResponse | null>(null);
  const [allDates, setAllDates] = useState<DateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchPage = useCallback(async (p: number) => {
    const res = await fetch(`/api/stocks/history?page=${p}`);
    if (!res.ok) return null;
    return (await res.json()) as HistoryResponse;
  }, []);

  useEffect(() => {
    if (tier === "free") {
      setLoading(false);
      return;
    }
    fetchPage(1).then((result) => {
      if (result) {
        setData(result);
        setAllDates(result.dates);
        setHasMore(result.dates.length > 0 && result.page * 7 < result.totalDates);
      }
      setLoading(false);
    });
  }, [tier, fetchPage]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    const result = await fetchPage(nextPage);
    if (result) {
      setAllDates((prev) => [...prev, ...result.dates]);
      setPage(nextPage);
      setHasMore(nextPage * 7 < result.totalDates);
    }
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
      </div>
    );
  }

  if (tier === "free") {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{t("title")}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t("subtitle")}</p>
        </div>
        <UpgradePaywall feature={t("title")} />
      </div>
    );
  }

  if (!data || allDates.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{t("title")}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t("subtitle")}</p>
        </div>
        <Card variant="glass" className="py-12 text-center">
          <p className="text-text-secondary">{t("noHistory")}</p>
        </Card>
      </div>
    );
  }

  const recurring = data.recurring.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{t("title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("subtitle")}</p>
      </div>

      {/* Most Recurring Section */}
      {recurring.length > 0 && (
        <>
          <SectionHeader overline={t("recurring")} title="" />
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {recurring.map((stock) => (
              <Card key={stock.symbol} variant="glass" padding="sm">
                <div className="text-sm font-semibold text-text-primary">
                  {stock.symbol}
                </div>
                <div className="text-xs text-text-secondary truncate">
                  {stock.name}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="accent" className="text-[10px]">
                    {t("pickedTimes", { count: stock.count })}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-text-tertiary">
                  {t("avgUpside", { value: stock.avgUpside })}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Timeline Section */}
      <div className="space-y-6">
        {allDates.map((group) => {
          const dateLabel = new Date(group.date + "T00:00:00Z").toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          });

          return (
            <div key={group.date}>
              <h3 className="mb-3 text-sm font-semibold text-text-secondary">
                {dateLabel}
              </h3>
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.picks.map((pick) => (
                  <Card key={pick.symbol} variant="glass" padding="sm" className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{getRegionFlag(pick.region)}</span>
                        <Badge className="text-[10px]">
                          {getSectorIcon(pick.sector)} {pick.sector}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-text-primary truncate">
                        {pick.symbol} &middot; {pick.name}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-semibold text-emerald-300">
                        +{pick.upside}%
                      </div>
                      {pick.appearances >= 3 && (
                        <Badge variant="warning" className="text-[10px]">
                          {t("nthTime", { count: pick.appearances })}
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "..." : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
