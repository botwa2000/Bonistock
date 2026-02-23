"use client";

import { useTranslations } from "next-intl";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";

interface GroupSite {
  name: string;
  url: string;
  description: string;
}

export default function AboutPageContent() {
  const t = useTranslations("about");

  const sections = [
    { title: t("mission"), text: t("missionText"), icon: "\uD83C\uDFAF" },
    { title: t("howWeWork"), text: t("howWeWorkText"), icon: "\u2699\uFE0F" },
    { title: t("transparency"), text: t("transparencyText"), icon: "\uD83D\uDD0D" },
    { title: t("team"), text: t("teamText"), icon: "\uD83D\uDC65", showGroupSites: true },
    { title: t("contact"), text: t("contactText"), icon: "\u2709\uFE0F" },
  ];

  const groupSites = t.raw("groupSites") as GroupSite[];

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

              {s.showGroupSites && groupSites && groupSites.length > 0 && (
                <div className="mt-4 space-y-3">
                  {groupSites.map((site) => (
                    <div
                      key={site.url}
                      className="rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3"
                    >
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        {site.name} &rarr;
                      </a>
                      <p className="mt-1 text-xs text-text-secondary">
                        {site.description}
                      </p>
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        {site.url}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </Container>
      <Footer />
    </div>
  );
}
