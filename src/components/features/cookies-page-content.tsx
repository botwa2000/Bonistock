"use client";

import { useTranslations } from "next-intl";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";

export default function CookiesPageContent() {
  const t = useTranslations("cookies");

  const essentialCookies = [
    {
      name: "authjs.session-token",
      purpose: "Maintains your login state across page navigation",
      duration: "Session / 30 days",
    },
    {
      name: "authjs.csrf-token",
      purpose: "Protects against cross-site request forgery attacks",
      duration: "Session",
    },
    {
      name: "authjs.callback-url",
      purpose: "Stores the redirect URL during OAuth login flows",
      duration: "Session",
    },
    {
      name: "bonistock_cc",
      purpose: "Records your cookie consent choice so the banner is not shown again",
      duration: "1 year",
    },
    {
      name: "NEXT_LOCALE",
      purpose: "Stores your language preference (en, de)",
      duration: "1 year",
    },
    {
      name: "NEXT_REGION",
      purpose: "Stores your market region preference (GLOBAL, DE)",
      duration: "1 year",
    },
  ];

  const analyticsCookies = [
    {
      name: "_ga / _ga_*",
      purpose: "Google Analytics — distinguishes unique visitors and tracks pageviews. Only set if you accept analytics cookies.",
      duration: "2 years",
    },
    {
      name: "ph_*",
      purpose: "PostHog — anonymous session and event tracking for product analytics. Only set if you accept analytics cookies.",
      duration: "1 year",
    },
  ];

  const marketingCookies = [
    {
      name: "Affiliate Attribution",
      purpose: "Tracks broker comparison clicks for affiliate commission attribution. Only set if you accept marketing cookies.",
      duration: "30 days",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <Container className="pb-24 pt-16" size="md">
        <h1 className="text-3xl font-bold text-text-primary">{t("title")}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t("lastUpdated")}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-text-secondary">
          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              What Are Cookies
            </h2>
            <p className="mt-2">
              Cookies are small text files stored on your device when you visit
              a website. They help us provide a better experience by remembering
              your preferences and understanding how you use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              Your Choices
            </h2>
            <p className="mt-2">
              When you first visit Bonistock, a cookie banner lets you choose:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Accept All</strong> &mdash; enables all cookie categories</li>
              <li><strong>Only Necessary</strong> &mdash; rejects analytics and marketing cookies</li>
              <li><strong>Customize</strong> &mdash; choose individually which optional categories to allow</li>
            </ul>
            <p className="mt-2">
              You can change your choice at any time by clearing your browser cookies
              for bonistock.com, which will show the banner again on your next visit.
            </p>
          </section>

          {/* Essential Cookies */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              Essential Cookies (always on)
            </h2>
            <p className="mb-3">
              These cookies are required for the site to function. They cannot be disabled.
            </p>
            <div className="space-y-3">
              {essentialCookies.map((cookie) => (
                <Card key={cookie.name} variant="glass" padding="md">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium font-mono text-xs text-text-primary">{cookie.name}</h3>
                      <p className="mt-1 text-text-secondary">{cookie.purpose}</p>
                    </div>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-text-secondary shrink-0 ml-3">
                      Essential
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-text-tertiary">
                    Duration: {cookie.duration}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          {/* Analytics Cookies */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              Analytics Cookies (opt-in)
            </h2>
            <p className="mb-3">
              These cookies help us understand how visitors interact with the site so we
              can improve the experience. They are only set if you accept analytics cookies.
            </p>
            <div className="space-y-3">
              {analyticsCookies.map((cookie) => (
                <Card key={cookie.name} variant="glass" padding="md">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium font-mono text-xs text-text-primary">{cookie.name}</h3>
                      <p className="mt-1 text-text-secondary">{cookie.purpose}</p>
                    </div>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-text-secondary shrink-0 ml-3">
                      Analytics
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-text-tertiary">
                    Duration: {cookie.duration}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          {/* Marketing Cookies */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              Marketing Cookies (opt-in)
            </h2>
            <p className="mb-3">
              These cookies are used for affiliate attribution tracking. They are only
              set if you accept marketing cookies.
            </p>
            <div className="space-y-3">
              {marketingCookies.map((cookie) => (
                <Card key={cookie.name} variant="glass" padding="md">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium font-mono text-xs text-text-primary">{cookie.name}</h3>
                      <p className="mt-1 text-text-secondary">{cookie.purpose}</p>
                    </div>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-text-secondary shrink-0 ml-3">
                      Marketing
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-text-tertiary">
                    Duration: {cookie.duration}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              Local Storage
            </h2>
            <p className="mt-2">
              In addition to cookies, we use browser local storage to store your
              cookie consent preferences (<code className="text-xs font-mono text-text-primary">bonistock_cookie_consent</code>)
              as a backup in case cookies are cleared.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
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
