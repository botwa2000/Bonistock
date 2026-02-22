"use client";

import { useState, useEffect } from "react";
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
    { key: "problem1", icon: "\u2728" },
    { key: "problem2", icon: "\uD83C\uDFAF" },
    { key: "problem3", icon: "\u26A1" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {problems.map((p) => (
        <Card key={p.key} variant="default">
          <div className="text-3xl">{p.icon}</div>
          <h3 className="mt-3 text-base font-semibold text-text-primary">
            {t(`${p.key}Title`)}
          </h3>
          <p className="mt-2 text-sm text-text-secondary">{t(`${p.key}Text`)}</p>
        </Card>
      ))}
    </div>
  );
}

function ProofSection() {
  const t = useTranslations("landing");

  const stats = [
    { value: "200+", label: t("proof1") },
    { value: "100+", label: t("proof2") },
    { value: "48", label: t("proof3") },
    { value: "$0", label: t("proof4") },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} variant="glass" className="text-center">
          <div className="text-3xl font-bold text-emerald-300">{s.value}</div>
          <div className="mt-1 text-sm text-text-secondary">{s.label}</div>
        </Card>
      ))}
    </div>
  );
}

interface EtfData {
  symbol: string;
  name: string;
  cagr1y: number;
  cagr3y: number | null;
  cagr5y: number | null;
  fee: number | null;
  theme: string;
}

function formatCagr(value: number | null): { text: string; color: string } {
  if (value == null) return { text: "N/A", color: "text-text-tertiary" };
  return {
    text: `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
    color: value >= 0 ? "text-emerald-400" : "text-rose-400",
  };
}

function EtfPreviewSection() {
  const t = useTranslations("landing");
  const [etfs, setEtfs] = useState<EtfData[]>([]);

  useEffect(() => {
    fetch("/api/etfs")
      .then((res) => res.json())
      .then((data: EtfData[]) => {
        if (Array.isArray(data)) setEtfs(data.slice(0, 6));
      })
      .catch(() => {});
  }, []);

  if (etfs.length === 0) return null;

  return (
    <section>
      <SectionHeader
        title={t("etfTitle")}
        subtitle={t("etfSubtitle")}
        action={
          <Link href="/login">
            <Button variant="secondary" size="sm">
              {t("heroCta")}
            </Button>
          </Link>
        }
      />
      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {etfs.map((etf) => {
          const y1 = formatCagr(etf.cagr1y);
          const y3 = formatCagr(etf.cagr3y);
          const y5 = formatCagr(etf.cagr5y);
          return (
            <Card key={etf.symbol} variant="glass">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-text-primary">{etf.symbol}</span>
                  <span className="ml-2 text-xs text-text-tertiary">{etf.name}</span>
                </div>
                <Badge variant="accent">{etf.theme}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-text-tertiary">1Y return</div>
                  <div className={`font-semibold ${y1.color}`}>{y1.text}</div>
                </div>
                <div>
                  <div className="text-text-tertiary">3Y/yr</div>
                  <div className={`font-semibold ${y3.color}`}>{y3.text}</div>
                </div>
                <div>
                  <div className="text-text-tertiary">5Y/yr</div>
                  <div className={`font-semibold ${y5.color}`}>{y5.text}</div>
                </div>
              </div>
              <div className="mt-2 text-right text-xs text-text-tertiary">
                Fee: {etf.fee != null ? `${etf.fee.toFixed(2)}%` : "N/A"}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
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
        {/* Stock Preview (show the product immediately) */}
        <section>
          <SectionHeader
            overline={t("stockPreviewOverline")}
            title={t("featuresTitle")}
            subtitle={t("stockPreviewSubtitle")}
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
                <p className="mt-2 text-sm text-text-secondary">
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

        {/* Why Bonistock? */}
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

        {/* ETF Preview */}
        <EtfPreviewSection />

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
            <h2 className="text-2xl font-semibold text-text-primary">
              {t("ctaTitle")}
            </h2>
            <p className="mt-2 text-text-secondary">{t("ctaSubtitle")}</p>
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
