"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { Hero } from "@/components/features/hero";
import { HowItWorks } from "@/components/features/how-it-works";
import { PricingCards } from "@/components/features/pricing-cards";
import { DayPassSection } from "@/components/features/day-pass";
import { FaqSection } from "@/components/features/faq-section";
import { TickerCard } from "@/components/features/ticker-card";
import { stockPicks } from "@/lib/mock-data";

function ProblemSection() {
  const t = useTranslations("landing");

  const problems = [
    { key: "problem1", icon: "\uD83D\uDD12" },
    { key: "problem2", icon: "\uD83E\uDD2F" },
    { key: "problem3", icon: "\uD83D\uDCCA" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {problems.map((p) => (
        <Card key={p.key} variant="default">
          <div className="text-3xl">{p.icon}</div>
          <h3 className="mt-3 text-base font-semibold text-white">
            {t(`${p.key}Title`)}
          </h3>
          <p className="mt-2 text-sm text-white/60">{t(`${p.key}Text`)}</p>
        </Card>
      ))}
    </div>
  );
}

function ProofSection() {
  const t = useTranslations("landing");

  const stats = [
    { value: "200+", label: t("proof1") },
    { value: "30+", label: t("proof2") },
    { value: "48", label: t("proof3") },
    { value: "$0", label: t("proof4") },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} variant="glass" className="text-center">
          <div className="text-3xl font-bold text-emerald-300">{s.value}</div>
          <div className="mt-1 text-sm text-white/60">{s.label}</div>
        </Card>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const t = useTranslations("landing");

  const remainingStocks = stockPicks.length - 5;

  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />

      <Container className="space-y-20 pb-24">
        {/* Problem */}
        <section>
          <SectionHeader title={t("problemTitle")} centered />
          <div className="mt-8">
            <ProblemSection />
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works">
          <SectionHeader title={t("howTitle")} centered />
          <div className="mt-8">
            <HowItWorks />
          </div>
        </section>

        {/* Feature preview: Upside List */}
        <section>
          <SectionHeader
            overline="Preview"
            title={t("featuresTitle")}
            subtitle="Top 5 upside stocks — sign up to see the full list."
            action={
              <Link href="/login">
                <Button variant="secondary" size="sm">
                  {t("heroCta")}
                </Button>
              </Link>
            }
          />
          <div className="relative mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {stockPicks.slice(0, 5).map((pick) => (
              <TickerCard key={pick.symbol} pick={pick} />
            ))}
            <Card variant="glass" className="flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <Badge variant="accent">+{remainingStocks} more</Badge>
                <p className="mt-2 text-sm text-white/60">
                  Sign up to see the full Upside List
                </p>
                <Link href="/login">
                  <Button size="sm" className="mt-3">
                    {t("heroCta")}
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </section>

        {/* Social proof */}
        <section>
          <SectionHeader title={t("proofTitle")} centered />
          <div className="mt-8">
            <ProofSection />
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing">
          <SectionHeader
            title={t("pricingTitle")}
            subtitle={t("pricingSubtitle")}
            centered
          />
          <div className="mt-8">
            <PricingCards />
          </div>
          <div className="mt-8">
            <DayPassSection />
          </div>
        </section>

        {/* FAQ */}
        <section>
          <SectionHeader title={t("faqTitle")} centered />
          <div className="mt-8">
            <FaqSection />
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="text-center">
          <Card variant="accent" padding="lg" className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-semibold text-white">
              {t("ctaTitle")}
            </h2>
            <p className="mt-2 text-white/70">{t("ctaSubtitle")}</p>
            <Link href="/login">
              <Button size="lg" className="mt-6">
                {t("ctaCta")}
              </Button>
            </Link>
          </Card>
        </section>
      </Container>

      <Footer />
    </div>
  );
}
