"use client";

import { useTranslations } from "next-intl";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { FaqSection } from "@/components/features/faq-section";
import type { FaqItem } from "@/lib/types";

export default function FaqPageContent() {
  const t = useTranslations("faq");

  const items = t.raw("items") as FaqItem[];

  return (
    <div className="min-h-screen">
      <Navbar />
      <Container className="pb-24 pt-16" size="md">
        <h1 className="text-3xl font-bold text-text-primary">{t("title")}</h1>
        <p className="mt-2 text-text-secondary">{t("subtitle")}</p>
        <div className="mt-10">
          <FaqSection items={items} />
        </div>
      </Container>
      <Footer />
    </div>
  );
}
