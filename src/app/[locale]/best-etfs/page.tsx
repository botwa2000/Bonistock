import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { BestEtfsContent } from "@/components/features/best-etfs-content";

export const metadata: Metadata = {
  title: "Best ETFs Ranked by Actual Returns",
  description:
    "Top ETFs ranked by real 1-year, 3-year, and 5-year compound annual growth rates (CAGR). 100+ ETFs tracked weekly. Free to view.",
  openGraph: {
    title: "Best ETFs Ranked by Actual Returns — Bonistock",
    description:
      "ETFs ranked by actual 1/3/5-year CAGR. Updated weekly.",
  },
};

export const revalidate = 3600;

function BestEtfsJsonLd({
  etfs,
}: {
  etfs: { symbol: string; name: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Best ETFs by Real Returns",
    description:
      "ETFs ranked by actual compound annual growth rates over 1, 3, and 5 years, tracked by Bonistock.",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: etfs.length,
    itemListElement: etfs.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${e.symbol} — ${e.name}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function BestEtfsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const etfs = await db.etf.findMany({
    select: { symbol: true, name: true, theme: true, region: true },
    orderBy: [{ cagr5y: { sort: "desc", nulls: "last" } }, { cagr1y: "desc" }],
    take: 20,
  });

  const totalCount = await db.etf.count();

  return (
    <>
      <BestEtfsJsonLd etfs={etfs} />
      <BestEtfsContent etfs={etfs} totalCount={totalCount} />
    </>
  );
}
