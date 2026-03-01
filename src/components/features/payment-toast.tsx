"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useState, useEffect } from "react";
import { Toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { trackEvent } from "@/components/features/analytics";

function PaymentToastInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { refreshUser } = useAuth();
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    const subscription = searchParams.get("subscription");
    const pass = searchParams.get("pass");
    const canceled = searchParams.get("canceled");
    const sessionId = searchParams.get("session_id");

    if (subscription === "success") {
      setToast({ message: "Subscription activated! Welcome to Plus.", variant: "success" });
    } else if (pass === "success") {
      setToast({ message: "Pass purchased! Activate it from your dashboard.", variant: "success" });
    } else if (canceled === "true") {
      setToast({ message: "Payment canceled. No charges were made.", variant: "info" });
    } else {
      return;
    }

    // Fire conversion event with dynamic value from Stripe session
    if ((subscription === "success" || pass === "success") && sessionId) {
      fetch(`/api/stripe/session?id=${encodeURIComponent(sessionId)}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (!data) return;
          const itemName = subscription === "success" ? "Bonistock Plus" : "Day Pass";
          const itemId = subscription === "success" ? "plus_subscription" : "day_pass";

          // GA4 standard e-commerce purchase event (flows to Google Ads via linked property)
          trackEvent("purchase", {
            transaction_id: data.sessionId,
            value: data.amount,
            currency: data.currency,
            items: [{ item_id: itemId, item_name: itemName, price: data.amount, quantity: 1 }],
          });
        })
        .catch(() => { /* analytics failure is non-critical */ });
    }

    // Clean URL params — use usePathname (locale-stripped) to avoid double-prefix
    const url = new URL(window.location.href);
    url.searchParams.delete("subscription");
    url.searchParams.delete("pass");
    url.searchParams.delete("canceled");
    url.searchParams.delete("session_id");
    const remainingSearch = url.search;
    router.replace(pathname + remainingSearch, { scroll: false });

    // Refresh user tier after successful payment (webhook may need a moment)
    if (subscription === "success" || pass === "success") {
      const t1 = setTimeout(() => refreshUser(), 1500);
      const t2 = setTimeout(() => refreshUser(), 4000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [searchParams, router, pathname, refreshUser]);

  if (!toast) return null;

  return (
    <Toast
      message={toast.message}
      variant={toast.variant}
      onClose={() => setToast(null)}
    />
  );
}

export function PaymentToast() {
  return (
    <Suspense fallback={null}>
      <PaymentToastInner />
    </Suspense>
  );
}
