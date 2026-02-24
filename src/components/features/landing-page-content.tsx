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
import { FaqSection } from "@/components/features/faq-section";
import { TickerCard } from "@/components/features/ticker-card";
import type { StockPick } from "@/lib/types";

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

function InvestmentPreviewSection() {
  const t = useTranslations("landing");
  const [stocks, setStocks] = useState<StockPick[]>([]);
  const [etfs, setEtfs] = useState<EtfData[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/stocks").then((res) => res.json()).catch(() => []),
      fetch("/api/etfs").then((res) => res.json()).catch(() => []),
    ]).then(([stockData, etfData]: [StockPick[], EtfData[]]) => {
      if (Array.isArray(stockData)) setStocks(stockData);
      if (Array.isArray(etfData)) setEtfs(etfData);
    });
  }, []);

  if (stocks.length === 0 && etfs.length === 0) return null;

  const unlockedStocks = stocks.slice(0, 2);
  const lockedStocks = stocks.slice(2, 4);
  const unlockedEtfs = etfs.slice(0, 2);
  const lockedEtfs = etfs.slice(2, 4);

  return (
    <section>
      <SectionHeader
        overline={t("stockPreviewOverline")}
        title={t("previewTitle")}
        subtitle={t("previewSubtitle")}
        action={
          <Link href="/login">
            <Button variant="secondary" size="sm">
              {t("heroCta")}
            </Button>
          </Link>
        }
      />

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Stocks column */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{t("stockSectionTitle")}</h3>
            <p className="mt-0.5 text-xs text-text-secondary">{t("stockSectionSubtitle")}</p>
          </div>
          {unlockedStocks.map((pick) => (
            <TickerCard key={pick.symbol} pick={pick} compact />
          ))}
          {lockedStocks.map((pick) => (
            <TickerCard key={pick.symbol} pick={pick} locked />
          ))}
        </div>

        {/* ETFs column */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{t("etfSectionTitle")}</h3>
            <p className="mt-0.5 text-xs text-text-secondary">{t("etfSectionSubtitle")}</p>
          </div>
          {unlockedEtfs.map((etf) => {
            const y1 = formatCagr(etf.cagr1y);
            const y3 = formatCagr(etf.cagr3y);
            const y5 = formatCagr(etf.cagr5y);
            return (
              <Card key={etf.symbol} variant="glass" className="border-l-2 border-l-blue-400/40">
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
          {lockedEtfs.map((etf) => (
            <Card key={etf.symbol} variant="glass" className="relative select-none border-l-2 border-l-blue-400/40">
              <div className="blur-[6px] pointer-events-none opacity-40">
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
                    <div className="font-semibold text-emerald-400">+••%</div>
                  </div>
                  <div>
                    <div className="text-text-tertiary">3Y/yr</div>
                    <div className="font-semibold text-emerald-400">+••%</div>
                  </div>
                  <div>
                    <div className="text-text-tertiary">5Y/yr</div>
                    <div className="font-semibold text-emerald-400">+••%</div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated/80 backdrop-blur-sm border border-border">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <Link
                  href="/pricing"
                  className="rounded-lg bg-emerald-400/90 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-emerald-300 transition-colors"
                >
                  Unlock with Pass or Plus
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA below both columns */}
      <Card variant="glass" className="mt-6 flex items-center justify-center min-h-[120px]">
        <div className="text-center">
          <Badge variant="accent">{t("moreInvestments")}</Badge>
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
    </section>
  );
}

export default function LandingPageContent() {
  const t = useTranslations("landing");

  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />

      <Container className="space-y-20 pb-24">
        {/* Investment Preview (stocks + ETFs from API) */}
        <InvestmentPreviewSection />

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
        </section>

        {/* FAQ */}
        <section>
          <SectionHeader title={t("faqTitle")} centered />
          <div className="mt-8">
            <FaqSection limit={6} />
            <div className="mt-4 text-center">
              <Link href="/faq" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                {t("seeAllFaqs")} &rarr;
              </Link>
            </div>
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
