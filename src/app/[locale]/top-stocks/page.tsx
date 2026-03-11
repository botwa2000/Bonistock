import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { TopStocksContent } from "@/components/features/top-stocks-content";

export const metadata: Metadata = {
  title: "Top Stocks Ranked by Analyst Consensus",
  description:
    "See today's highest-rated stocks ranked by professional analyst buy consensus and upside potential. 200+ stocks scored nightly. Free to view.",
  openGraph: {
    title: "Top Stocks Ranked by Analyst Consensus — Bonistock",
    description:
      "Stocks ranked by analyst upside and buy consensus. Updated nightly.",
  },
};

export const revalidate = 3600;

function TopStocksJsonLd({
  stocks,
}: {
  stocks: { symbol: string; name: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Top Stocks by Analyst Consensus",
    description:
      "Stocks ranked by analyst upside potential and buy consensus, updated nightly by Bonistock.",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: stocks.length,
    itemListElement: stocks.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${s.symbol} — ${s.name}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function TopStocksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const stocks = await db.stock.findMany({
    select: { symbol: true, name: true, sector: true, region: true },
    orderBy: { upside: "desc" },
    take: 20,
  });

  const totalCount = await db.stock.count();

  return (
    <>
      <TopStocksJsonLd stocks={stocks} />
      <TopStocksContent stocks={stocks} totalCount={totalCount} />
    </>
  );
}
