"use client";

import { useTranslations } from "next-intl";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";

export default function CookiesPage() {
  const t = useTranslations("cookies");

  const cookies = [
    {
      name: "Session",
      purpose: "Maintains your login state across page navigation",
      duration: "Session (cleared on browser close)",
      type: "Essential",
    },
    {
      name: "Preferences",
      purpose: "Stores your selected tier, goal, and filter preferences",
      duration: "1 year",
      type: "Functional",
    },
    {
      name: "Analytics",
      purpose: "Anonymous usage data to improve the service (Vercel Analytics)",
      duration: "1 year",
      type: "Analytics",
    },
    {
      name: "Affiliate Attribution",
      purpose:
        "Tracks broker comparison clicks for affiliate commission attribution",
      duration: "30 days",
      type: "Marketing",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <Container className="pb-24 pt-16" size="md">
        <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
        <p className="mt-2 text-sm text-white/60">{t("lastUpdated")}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-white/70">
          <section>
            <h2 className="text-lg font-semibold text-white">
              What Are Cookies
            </h2>
            <p className="mt-2">
              Cookies are small text files stored on your device when you visit
              a website. They help us provide a better experience by remembering
              your preferences and understanding how you use the service.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Cookies We Use
            </h2>
            <div className="space-y-3">
              {cookies.map((cookie) => (
                <Card key={cookie.name} variant="glass" padding="md">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-white">{cookie.name}</h3>
                      <p className="mt-1 text-white/60">{cookie.purpose}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">
                      {cookie.type}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/50">
                    Duration: {cookie.duration}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              Managing Cookies
            </h2>
            <p className="mt-2">
              You can control and delete cookies through your browser settings.
              Disabling essential cookies may affect your ability to use the
              service. For more information on managing cookies, visit your
              browser&apos;s help documentation.
            </p>
          </section>
        </div>
      </Container>
      <Footer />
    </div>
  );
}
