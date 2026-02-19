"use client";

import { useTranslations } from "next-intl";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";

export default function PrivacyPage() {
  const t = useTranslations("privacy");

  return (
    <div className="min-h-screen">
      <Navbar />
      <Container className="pb-24 pt-16" size="md">
        <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
        <p className="mt-2 text-sm text-white/60">{t("lastUpdated")}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-white/70">
          <section>
            <h2 className="text-lg font-semibold text-white">
              1. Information We Collect
            </h2>
            <p className="mt-2">
              We collect information you provide directly: email address, username,
              investment goal preference, and subscription tier. We also collect
              usage data including pages viewed, features used, and broker
              comparison clicks through standard web analytics.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              2. How We Use Your Information
            </h2>
            <p className="mt-2">
              Your information is used to: provide and personalize the service,
              process subscription payments, send alerts and notifications you
              opt into, improve our scoring algorithms, and attribute broker
              referrals for affiliate commission tracking.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              3. Data Sharing
            </h2>
            <p className="mt-2">
              We do not sell your personal data. We share limited data with:
              payment processors (Stripe) for subscription management, broker
              partners for affiliate attribution (click events only, no PII),
              and analytics providers for service improvement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              4. Data Storage & Security
            </h2>
            <p className="mt-2">
              Your data is stored in Supabase (PostgreSQL) with Row Level
              Security policies. Authentication uses industry-standard
              practices. We retain your data for as long as your account is
              active, plus 30 days after deletion request.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              5. Your Rights (GDPR)
            </h2>
            <p className="mt-2">
              You have the right to access, correct, delete, and export your
              personal data. You can exercise these rights through your account
              settings or by contacting us at privacy@bonifatus.io.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Contact</h2>
            <p className="mt-2">
              For privacy-related inquiries, contact privacy@bonifatus.io.
            </p>
          </section>
        </div>
      </Container>
      <Footer />
    </div>
  );
}
