import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import messages from "../../../../messages/en.json";
import FaqPageContent from "@/components/features/faq-page-content";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Find answers about stock scores, ETF rankings, Auto-Mix, pricing, Day Passes, and how Bonistock works.",
};

function FaqJsonLd() {
  const items = messages.faq.items;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <FaqJsonLd />
      <FaqPageContent />
    </>
  );
}
