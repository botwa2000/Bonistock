"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "bonistock_cookie_consent";
const CONSENT_COOKIE = "bonistock_cc";
const CONSENT_VERSION = "2";

interface CookieConsent {
  version: string;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

function getConsentCookieVersion(): string | null {
  const match = document.cookie.split(";").find((c) => c.trim().startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  return match.split("=")[1]?.trim() ?? null;
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const cookieVersion = getConsentCookieVersion();
    const stored = localStorage.getItem(CONSENT_KEY);

    console.log("[CookieConsent] init", { cookieVersion, hasStored: !!stored });

    // Show banner if: no cookie, wrong version, no localStorage data, or version mismatch
    if (!cookieVersion || cookieVersion !== CONSENT_VERSION) {
      if (stored) {
        try {
          const consent = JSON.parse(stored) as CookieConsent;
          if (consent.version === CONSENT_VERSION) {
            // localStorage is current but cookie is missing — re-set cookie and notify analytics
            document.cookie = `${CONSENT_COOKIE}=${consent.version}; max-age=31536000; path=/; SameSite=Lax`;
            window.dispatchEvent(new Event("cookie-consent-update"));
            console.log("[CookieConsent] restored cookie from localStorage", consent);
            return;
          }
        } catch { /* show banner */ }
      }
      setVisible(true);
      return;
    }

    // Cookie version matches — verify localStorage exists and is valid
    if (!stored) {
      setVisible(true);
      return;
    }
    try {
      const consent = JSON.parse(stored) as CookieConsent;
      if (consent.version !== CONSENT_VERSION) {
        setVisible(true);
      } else {
        // Everything valid — notify analytics in case it mounted before consent was checked
        window.dispatchEvent(new Event("cookie-consent-update"));
        console.log("[CookieConsent] valid consent found", consent);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const save = (consent: CookieConsent) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    document.cookie = `${CONSENT_COOKIE}=${consent.version}; max-age=31536000; path=/; SameSite=Lax`;
    setVisible(false);

    console.log("[CookieConsent] saved", consent);
    console.log("[CookieConsent] localStorage verify:", localStorage.getItem(CONSENT_KEY));

    // Notify analytics component in the same tab
    window.dispatchEvent(new Event("cookie-consent-update"));

    // Persist to DB for logged-in users
    fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cookieConsent: {
          analytics: consent.analytics,
          marketing: consent.marketing,
        },
      }),
    }).catch(() => {});
  };

  const acceptAll = () => {
    save({
      version: CONSENT_VERSION,
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    });
  };

  const onlyNecessary = () => {
    save({
      version: CONSENT_VERSION,
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    });
  };

  const saveCustom = () => {
    save({
      version: CONSENT_VERSION,
      necessary: true,
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
    });
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-overlay-bg backdrop-blur-sm p-4 md:p-6">
      <div className="mx-auto max-w-4xl">
        <h3 className="text-sm font-semibold text-text-primary">Cookie Settings</h3>
        <p className="mt-1 text-xs text-text-secondary">
          We use cookies for essential site functionality. Optional cookies help us understand
          usage and improve the experience. Read our{" "}
          <Link href="/cookies" className="underline text-text-primary">
            Cookie Policy
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline text-text-primary">
            Privacy Policy
          </Link>
          .
        </p>

        {/* Customize section — expandable */}
        {showCustomize && (
          <div className="mt-3 space-y-2 rounded-lg border border-border-subtle bg-surface p-3">
            <label className="flex items-center gap-2 text-xs text-text-tertiary">
              <input type="checkbox" checked disabled className="accent-accent-fg" />
              <span>Necessary &mdash; login, preferences, security (always on)</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="accent-accent-fg"
              />
              <span>Analytics &mdash; anonymous usage data (PostHog, Google Analytics)</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="accent-accent-fg"
              />
              <span>Marketing &mdash; affiliate attribution tracking</span>
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button size="sm" onClick={acceptAll}>
            Accept All
          </Button>
          <Button variant="secondary" size="sm" onClick={onlyNecessary}>
            Only Necessary
          </Button>
          {showCustomize ? (
            <Button variant="secondary" size="sm" onClick={saveCustom}>
              Save Preferences
            </Button>
          ) : (
            <button
              onClick={() => setShowCustomize(true)}
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors underline"
            >
              Customize
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
