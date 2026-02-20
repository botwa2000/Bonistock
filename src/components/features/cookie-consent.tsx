"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "bonistock_cookie_consent";
const CONSENT_VERSION = "1";

interface CookieConsent {
  version: string;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      setVisible(true);
      return;
    }
    try {
      const consent = JSON.parse(stored) as CookieConsent;
      if (consent.version !== CONSENT_VERSION) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const save = (consent: CookieConsent) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    setVisible(false);

    // If user is logged in, persist to DB
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

  const acceptSelected = () => {
    save({
      version: CONSENT_VERSION,
      necessary: true,
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
    });
  };

  const rejectOptional = () => {
    save({
      version: CONSENT_VERSION,
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    });
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/95 backdrop-blur-sm p-4 md:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">Cookie Settings</h3>
            <p className="mt-1 text-xs text-white/60">
              We use cookies to provide essential functionality and improve your experience.
              Required cookies are always active. You can choose which optional cookies to allow.
            </p>

            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2 text-xs text-white/50">
                <input type="checkbox" checked disabled className="accent-emerald-400" />
                <span>Necessary (always on)</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-white/70">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="accent-emerald-400"
                />
                <span>Analytics — helps us understand how you use the app</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-white/70">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="accent-emerald-400"
                />
                <span>Marketing — personalized content and offers</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:ml-6">
            <Button size="sm" onClick={acceptAll}>
              Accept all
            </Button>
            <Button variant="secondary" size="sm" onClick={acceptSelected}>
              Save preferences
            </Button>
            <button
              onClick={rejectOptional}
              className="text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Reject optional
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
