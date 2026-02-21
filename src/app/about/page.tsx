"use client";

import { useTranslations } from "next-intl";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";

export default function AboutPage() {
  const t = useTranslations("about");

  const sections = [
    { title: t("mission"), text: t("missionText"), icon: "\uD83C\uDFAF" },
    { title: t("howWeWork"), text: t("howWeWorkText"), icon: "\u2699\uFE0F" },
    {
      title: t("transparency"),
      text: t("transparencyText"),
      icon: "\uD83D\uDD0D",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <Container className="pb-24 pt-16" size="md">
        <h1 className="text-3xl font-bold text-text-primary">{t("title")}</h1>

        <div className="mt-10 space-y-6">
          {sections.map((s) => (
            <Card key={s.title} variant="glass" padding="lg">
              <div className="text-3xl">{s.icon}</div>
              <h2 className="mt-3 text-xl font-semibold text-text-primary">
                {s.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {s.text}
              </p>
            </Card>
          ))}
        </div>
      </Container>
      <Footer />
    </div>
  );
}
