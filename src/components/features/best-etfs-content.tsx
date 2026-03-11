"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";

interface EtfPreview {
  symbol: string;
  name: string;
  theme: string;
  region: string;
}

const VISIBLE_COUNT = 2;
const BLURRED_ROWS = 8;

export function BestEtfsContent({
  etfs,
  totalCount,
}: {
  etfs: EtfPreview[];
  totalCount: number;
}) {
  const t = useTranslations("bestEtfs");
  const visible = etfs.slice(0, VISIBLE_COUNT);

  return (
    <div className="min-h-screen">
      <Navbar />
      <Container className="space-y-10 py-12 pb-20">
        <SectionHeader title={t("title")} subtitle={t("subtitle")} />

        {/* 2 visible preview cards — no numerical data */}
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((etf, i) => (
            <Card
              key={etf.symbol}
              variant="glass"
              className="flex flex-col gap-2 border-l-2 border-l-blue-400/40"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="info">ETF</Badge>
                <Badge variant="accent">{etf.theme}</Badge>
                <Badge variant="accent">#{i + 1}</Badge>
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                {etf.symbol} &middot; {etf.name}
              </h3>
              <p className="text-xs text-text-tertiary">{t("rankedLabel")}</p>
            </Card>
          ))}
        </div>

        {/* Blurred section — no real data in DOM */}
        <div className="relative">
          <div className="space-y-2 select-none pointer-events-none opacity-40 blur-[6px]">
            {Array.from({ length: BLURRED_ROWS }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-l-2 border-border border-l-blue-400/40 bg-surface px-3 py-2.5 text-sm"
              >
                <span className="w-8 text-text-tertiary">#{i + VISIBLE_COUNT + 1}</span>
                <span className="h-3 w-16 rounded bg-text-tertiary/20" />
                <span className="h-3 flex-1 rounded bg-text-tertiary/10" />
                <span className="h-3 w-12 rounded bg-text-tertiary/20" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-elevated/80 backdrop-blur-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-text-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <Badge variant="accent">
              {t("moreEtfs", { count: totalCount - VISIBLE_COUNT })}
            </Badge>
            <Link href="/login">
              <Button>{t("registerToSee")}</Button>
            </Link>
          </div>
        </div>

        {/* CTA */}
        <Card variant="accent" padding="lg" className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-semibold text-text-primary">
            {t("ctaTitle")}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">{t("ctaText")}</p>
          <Link href="/login">
            <Button size="lg" className="mt-4">
              {t("ctaButton")}
            </Button>
          </Link>
        </Card>

        {/* SEO text content — keyword-rich for Google */}
        <article className="space-y-6 text-sm leading-relaxed text-text-secondary">
          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              {t("seoTitle1")}
            </h2>
            <p className="mt-2">{t("seoText1")}</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              {t("seoTitle2")}
            </h2>
            <p className="mt-2">{t("seoText2")}</p>
          </section>
        </article>

        <p className="text-xs text-text-tertiary">{t("disclaimer")}</p>
      </Container>
      <Footer />
    </div>
  );
}
