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
        <p className="mt-2 text-sm text-white/60">Last updated: February 20, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-white/70">
          <section>
            <h2 className="text-lg font-semibold text-white">
              1. Who We Are
            </h2>
            <p className="mt-2">
              Bonistock (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website bonistock.com.
              We provide a stock and ETF advisory platform that aggregates publicly
              available analyst data, ratings, and price targets for informational
              purposes. This Privacy Policy explains how we collect, use, store, and
              protect your personal data in compliance with the EU General Data Protection
              Regulation (GDPR) and other applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              2. Information We Collect
            </h2>
            <p className="mt-2 font-medium text-white/80">Account information:</p>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              <li>Email address, name, and profile picture (provided directly or via Google/Facebook login)</li>
              <li>Password hash (if using email/password authentication)</li>
              <li>Investment goal preference, region, language, and theme settings</li>
            </ul>
            <p className="mt-3 font-medium text-white/80">Payment information:</p>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              <li>Subscription tier and billing status (managed by Stripe)</li>
              <li>We do NOT store credit card numbers, CVVs, or full payment details &mdash; Stripe handles all payment data directly</li>
            </ul>
            <p className="mt-3 font-medium text-white/80">Usage data:</p>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              <li>Watchlist items, saved mixes, alerts, and portfolio holdings you create</li>
              <li>Login timestamps, IP addresses, and user agent strings (for security auditing)</li>
              <li>Pages viewed and features used (if analytics cookies are accepted)</li>
            </ul>
            <p className="mt-3 font-medium text-white/80">Data from third-party login providers:</p>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              <li><strong>Google:</strong> name, email address, profile picture</li>
              <li><strong>Facebook:</strong> name, email address, profile picture. We do NOT access your friends list, posts, or any other Facebook data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              3. How We Use Your Information
            </h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Provide, personalize, and improve the service</li>
              <li>Authenticate your identity and secure your account</li>
              <li>Process subscription payments and pass purchases via Stripe</li>
              <li>Send transactional emails (verification, password reset, purchase confirmations)</li>
              <li>Send alerts and notifications you opt into</li>
              <li>Detect and prevent fraud, abuse, and security threats</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              4. Legal Basis for Processing (GDPR)
            </h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Contract:</strong> processing necessary to provide the service you signed up for</li>
              <li><strong>Consent:</strong> analytics and marketing cookies (opt-in via cookie banner)</li>
              <li><strong>Legitimate interest:</strong> security auditing, fraud prevention, service improvement</li>
              <li><strong>Legal obligation:</strong> tax and financial record-keeping requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              5. Data Sharing
            </h2>
            <p className="mt-2">
              We do not sell your personal data. We share limited data with:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Stripe</strong> &mdash; payment processing (name, email, billing info)</li>
              <li><strong>Brevo</strong> &mdash; transactional email delivery (email address, name)</li>
              <li><strong>Sentry</strong> &mdash; error tracking (anonymized technical data, no PII by default)</li>
              <li><strong>Google / Facebook</strong> &mdash; authentication only; we receive data from them but do not share your Bonistock data back</li>
              <li><strong>Broker partners</strong> &mdash; affiliate click attribution only (no PII is shared)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              6. Data Storage &amp; Security
            </h2>
            <p className="mt-2">
              Your data is stored in a PostgreSQL database hosted on a dedicated server
              in Germany (Hetzner, Falkenstein data center). We implement the following
              security measures:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>All data transmitted over HTTPS/TLS encryption</li>
              <li>Passwords hashed with bcrypt (cost factor 12)</li>
              <li>Two-factor authentication secrets encrypted with AES-256-GCM</li>
              <li>API rate limiting to prevent abuse</li>
              <li>Security headers (HSTS, CSP, X-Frame-Options)</li>
              <li>Account lockout after repeated failed login attempts</li>
              <li>Audit logging of security-relevant actions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              7. Data Retention
            </h2>
            <p className="mt-2">
              We retain your personal data for as long as your account is active.
              When you delete your account, we anonymize your personal data within
              30 days. Audit logs are retained for 12 months for security purposes.
              Payment records are retained as required by tax law (typically 7&ndash;10 years).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              8. Your Rights (GDPR)
            </h2>
            <p className="mt-2">You have the right to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Access</strong> &mdash; request a copy of all personal data we hold about you</li>
              <li><strong>Rectification</strong> &mdash; correct inaccurate personal data</li>
              <li><strong>Erasure</strong> &mdash; request deletion of your account and personal data</li>
              <li><strong>Data portability</strong> &mdash; export your data in a machine-readable format (JSON)</li>
              <li><strong>Restrict processing</strong> &mdash; limit how we use your data</li>
              <li><strong>Withdraw consent</strong> &mdash; revoke cookie consent or marketing preferences at any time</li>
              <li><strong>Object</strong> &mdash; object to processing based on legitimate interest</li>
            </ul>
            <p className="mt-3">
              You can exercise your data access, export, and deletion rights directly
              from your <strong>Settings</strong> page. For other requests, contact
              us at <a href="mailto:privacy@bonistock.com" className="text-white underline">privacy@bonistock.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              9. Cookies
            </h2>
            <p className="mt-2">
              We use the following categories of cookies:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Necessary</strong> (always active) &mdash; authentication session, CSRF protection, cookie consent preference</li>
              <li><strong>Analytics</strong> (opt-in) &mdash; anonymous usage statistics to improve the service</li>
              <li><strong>Marketing</strong> (opt-in) &mdash; affiliate attribution tracking</li>
            </ul>
            <p className="mt-2">
              You can manage your cookie preferences at any time via the cookie banner
              or in your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              10. Facebook Data
            </h2>
            <p className="mt-2">
              If you log in with Facebook, we receive your name, email address, and
              profile picture from Facebook. We use this data solely to create and
              authenticate your Bonistock account. We do not post to your Facebook
              timeline, access your friends list, or collect any other Facebook data.
            </p>
            <p className="mt-2">
              To disconnect Facebook from your Bonistock account, visit your Settings
              page. To request deletion of all data associated with your Facebook login,
              visit our <a href="/account/data-deletion" className="text-white underline">Data Deletion</a> page
              or delete your account from Settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              11. Children&apos;s Privacy
            </h2>
            <p className="mt-2">
              Bonistock is not intended for users under the age of 18. We do not
              knowingly collect personal data from children. If you believe a child
              has provided us with personal data, please contact us and we will
              delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              12. Changes to This Policy
            </h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. Material changes
              will be communicated via email or in-app notification. The &quot;last
              updated&quot; date at the top indicates the most recent revision.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">13. Contact</h2>
            <p className="mt-2">
              For privacy-related inquiries:<br />
              Email: <a href="mailto:privacy@bonistock.com" className="text-white underline">privacy@bonistock.com</a><br />
              Data Protection Officer: privacy@bonistock.com
            </p>
            <p className="mt-2">
              If you are unsatisfied with our response, you have the right to lodge a complaint
              with your local data protection authority.
            </p>
          </section>
        </div>
      </Container>
      <Footer />
    </div>
  );
}
