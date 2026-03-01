"use client";

import { useEffect, useState, useRef } from "react";

const CONSENT_KEY = "bonistock_cookie_consent";

function getAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return false;
    const consent = JSON.parse(stored);
    return consent.analytics === true;
  } catch {
    return false;
  }
}

export function Analytics() {
  const [enabled, setEnabled] = useState(false);
  const injected = useRef(false);

  useEffect(() => {
    setEnabled(getAnalyticsConsent());

    // Cross-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_KEY) {
        setEnabled(getAnalyticsConsent());
      }
    };

    // Same-tab sync (fired by cookie consent banner)
    const handleConsentUpdate = () => {
      setEnabled(getAnalyticsConsent());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("cookie-consent-update", handleConsentUpdate);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("cookie-consent-update", handleConsentUpdate);
    };
  }, []);

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

  // Debug: log analytics state (check browser console)
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(CONSENT_KEY) : null;
    console.log("[Analytics]", { enabled, gaId: gaId ?? "(empty)", adsId: adsId ?? "(empty)", posthogKey: posthogKey ? "set" : "(empty)", localStorage: stored });
  }, [enabled]);

  // Inject scripts directly into DOM when consent is granted.
  // Using direct DOM injection instead of next/script to avoid issues
  // with conditional rendering after hydration.
  useEffect(() => {
    if (!enabled || injected.current) return;
    injected.current = true;

    const hasGtag = gaId || adsId;

    if (hasGtag) {
      // Initialize gtag BEFORE loading external script (standard pattern — stubs push to dataLayer)
      const gtagInit = document.createElement("script");
      gtagInit.textContent = [
        "window.dataLayer = window.dataLayer || [];",
        "function gtag(){dataLayer.push(arguments);}",
        "gtag('js', new Date());",
        gaId ? `gtag('config', '${gaId}');` : "",
        adsId ? `gtag('config', '${adsId}');` : "",
      ].filter(Boolean).join("\n");
      document.head.appendChild(gtagInit);

      // Load gtag.js (processes the dataLayer queue when ready)
      const gtagScript = document.createElement("script");
      gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId || adsId}`;
      gtagScript.async = true;
      gtagScript.onload = () => console.log("[Analytics] gtag.js loaded successfully");
      gtagScript.onerror = (e) => console.error("[Analytics] gtag.js FAILED to load", e);
      document.head.appendChild(gtagScript);
      console.log("[Analytics] gtag scripts injected, waiting for load...");
    }

    if (posthogKey) {
      const phScript = document.createElement("script");
      phScript.textContent = `
        !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group identify setPersonProperties setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags resetGroups onFeatureFlags addFeatureFlagsHandler onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
        posthog.init('${posthogKey}', {api_host: '${posthogHost}', defaults: '2026-01-30'});
      `;
      document.head.appendChild(phScript);
      console.log("[Analytics] PostHog script injected");
    }
  }, [enabled, gaId, adsId, posthogKey, posthogHost]);

  return null;
}

/**
 * Helper to fire gtag events from anywhere in the app.
 * Safe to call even if gtag is not loaded (analytics consent not given).
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}
