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
        <h1 className="text-3xl font-bold text-text-primary">{t("title")}</h1>
        <p className="mt-2 text-sm text-text-secondary">Last updated: February 20, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-text-secondary">
          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              1. Acceptance of Terms
            </h2>
            <p className="mt-2">
              By accessing or using Bonistock (&quot;the Service&quot;), you agree to be
              bound by these Terms of Service. If you do not agree to these
              terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              2. Not Financial Advice
            </h2>
            <p className="mt-2">
              Bonistock is an informational tool that aggregates publicly
              available analyst data, ratings, and price targets. The Service does not
              provide personalized investment advice, and nothing on the platform
              should be construed as a recommendation to buy, sell, or hold any
              security. You are solely responsible for your investment decisions.
              Always consult a licensed financial advisor before making investment
              decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              3. Account Registration
            </h2>
            <p className="mt-2">
              You may create an account using email/password, Google, or Facebook.
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activity under your account.
              You must be at least 18 years old to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              4. Subscriptions &amp; Passes
            </h2>
            <p className="mt-2">
              Bonistock offers free and paid tiers:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Free</strong> &mdash; limited access to stock data and features</li>
              <li><strong>Day Passes</strong> (1-day, 3-day, 12-day) &mdash; one-time purchase, each pass grants a set number of activation days</li>
              <li><strong>Plus</strong> &mdash; monthly or annual subscription with full access</li>
            </ul>
            <p className="mt-2">
              Subscriptions are billed monthly or annually as selected via Stripe.
              You may cancel at any time; access continues until the end of the
              billing period. Refunds are not provided for partial billing periods
              or unused day pass activations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              5. Data Accuracy
            </h2>
            <p className="mt-2">
              We source data from third-party providers (Financial Modeling Prep,
              Yahoo Finance) and make reasonable efforts to ensure accuracy.
              However, we do not guarantee the accuracy, completeness, or
              timeliness of any data displayed. Stock prices are delayed
              (end-of-day). Analyst ratings and price targets are aggregated
              averages and may not reflect individual analyst opinions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              6. Affiliate Disclosure
            </h2>
            <p className="mt-2">
              Bonistock may earn a commission when you open a brokerage account
              through links on the platform. This affiliate relationship does
              not affect our comparison methodology or scoring algorithms.
              Broker comparison results are not influenced by commission rates.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              7. Account Deletion
            </h2>
            <p className="mt-2">
              You may delete your account at any time from the Settings page. Upon
              deletion, your personal data will be anonymized within 30 days. Active
              subscriptions will be canceled. This action is irreversible.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              8. Prohibited Use
            </h2>
            <p className="mt-2">You agree not to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Scrape, crawl, or programmatically extract data from the Service</li>
              <li>Redistribute or resell data obtained from the Service</li>
              <li>Attempt to gain unauthorized access to other user accounts</li>
              <li>Use the Service for any illegal purpose</li>
              <li>Interfere with or disrupt the Service infrastructure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              9. Limitation of Liability
            </h2>
            <p className="mt-2">
              To the maximum extent permitted by law, Bonistock shall not be
              liable for any investment losses, indirect, incidental, special,
              or consequential damages arising from your use of the Service.
              Your use of the Service is at your sole risk. Our total liability
              shall not exceed the amount you paid us in the 12 months preceding
              the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              10. Governing Law
            </h2>
            <p className="mt-2">
              These Terms are governed by the laws of the Federal Republic of
              Germany. Any disputes shall be subject to the exclusive jurisdiction
              of the courts in Germany. For EU consumers, mandatory consumer
              protection laws of your country of residence apply.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              11. Changes to Terms
            </h2>
            <p className="mt-2">
              We reserve the right to modify these terms at any time. Material
              changes will be communicated via email or in-app notification at
              least 30 days before taking effect. Continued use after changes
              constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">12. Contact</h2>
            <p className="mt-2">
              For questions about these terms, contact{" "}
              <a href="mailto:legal@bonistock.com" className="text-white underline">legal@bonistock.com</a>.
            </p>
          </section>
        </div>
      </Container>
      <Footer />
    </div>
  );
}
