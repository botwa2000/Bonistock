"use client";

import { useTranslations } from "next-intl";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";

export default function TermsPage() {
  const t = useTranslations("terms");

  return (
    <div className="min-h-screen">
      <Navbar />
      <Container className="pb-24 pt-16" size="md">
        <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
        <p className="mt-2 text-sm text-white/60">{t("lastUpdated")}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-white/70">
          <section>
            <h2 className="text-lg font-semibold text-white">
              1. Acceptance of Terms
            </h2>
            <p className="mt-2">
              By accessing or using Bonifatus ("the Service"), you agree to be
              bound by these Terms of Service. If you do not agree to these
              terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              2. Not Financial Advice
            </h2>
            <p className="mt-2">
              Bonifatus is an informational tool that aggregates publicly
              available analyst data. The Service does not provide personalized
              investment advice, and nothing on the platform should be
              construed as a recommendation to buy, sell, or hold any security.
              You are solely responsible for your investment decisions. Always
              consult a licensed financial advisor before making investment
              decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              3. Account & Subscriptions
            </h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your
              account credentials. Subscriptions (Plus, Pro) are billed monthly
              or annually as selected. You may cancel at any time; access
              continues until the end of the billing period. Refunds are not
              provided for partial billing periods.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              4. Data Accuracy
            </h2>
            <p className="mt-2">
              We source data from third-party providers and make reasonable
              efforts to ensure accuracy. However, we do not guarantee the
              accuracy, completeness, or timeliness of any data displayed. All
              data for Free and Plus tiers is delayed (end-of-day). Analyst
              ratings and price targets are aggregated averages and may not
              reflect individual analyst opinions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              5. Affiliate Disclosure
            </h2>
            <p className="mt-2">
              Bonifatus may earn a commission when you open a brokerage account
              through links on the platform. This affiliate relationship does
              not affect our comparison methodology or scoring algorithms.
              Broker comparison results are not influenced by commission rates.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              6. Limitation of Liability
            </h2>
            <p className="mt-2">
              To the maximum extent permitted by law, Bonifatus shall not be
              liable for any investment losses, indirect, incidental, special,
              or consequential damages arising from your use of the Service.
              Your use of the Service is at your sole risk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              7. Changes to Terms
            </h2>
            <p className="mt-2">
              We reserve the right to modify these terms at any time. Material
              changes will be communicated via email or in-app notification.
              Continued use after changes constitutes acceptance of the revised
              terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Contact</h2>
            <p className="mt-2">
              For questions about these terms, contact legal@bonifatus.io.
            </p>
          </section>
        </div>
      </Container>
      <Footer />
    </div>
  );
}
