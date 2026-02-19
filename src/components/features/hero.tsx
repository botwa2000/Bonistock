"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export function Hero() {
  const t = useTranslations("landing");

  return (
    <section className="relative overflow-hidden pb-16 pt-20 md:pb-24 md:pt-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,232,165,0.08),transparent_60%)]" />
      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold leading-tight text-white md:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 text-lg text-white/70 md:text-xl">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg">{t("heroCta")}</Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="secondary" size="lg">
                {t("heroSecondaryCta")}
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
