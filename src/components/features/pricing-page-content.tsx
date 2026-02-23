"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { PricingCards } from "@/components/features/pricing-cards";
import { FaqSection } from "@/components/features/faq-section";
import { PaymentToast } from "@/components/features/payment-toast";

export default function PricingPageContent() {
  const t = useTranslations("pricing");
  const tLanding = useTranslations("landing");

  return (
    <div className="min-h-screen">
      <PaymentToast />
      <Navbar />
      <Container className="space-y-16 pb-24 pt-16">
        <SectionHeader
          title={t("title")}
          subtitle={t("subtitle")}
          centered
        />
        <PricingCards />

        <section>
          <SectionHeader title={tLanding("faqTitle")} centered />
          <div className="mt-8">
            <FaqSection limit={6} />
            <div className="mt-4 text-center">
              <Link href="/faq" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                {tLanding("seeAllFaqs")} &rarr;
              </Link>
            </div>
          </div>
        </section>
      </Container>
      <Footer />
    </div>
  );
}
