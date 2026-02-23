"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "bonistock_install_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const shouldShow = useCallback(() => {
    if (typeof window === "undefined") return false;
    // Don't show if already in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) return false;
    // Don't show if dismissed
    if (localStorage.getItem(DISMISS_KEY)) return false;
    return true;
  }, []);

  useEffect(() => {
    if (!shouldShow()) return;

    // Detect iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    setIsIOS(isiOS);

    // Show after delay (10 seconds)
    const timer = setTimeout(() => {
      if (isiOS) {
        setShowBanner(true);
      }
    }, 10000);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [shouldShow]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface-elevated/95 backdrop-blur-xl p-4 safe-bottom">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">
            Install Bonistock for quick access
          </p>
          {isIOS ? (
            <p className="text-xs text-text-secondary mt-0.5">
              Tap Share then &ldquo;Add to Home Screen&rdquo;
            </p>
          ) : (
            <p className="text-xs text-text-secondary mt-0.5">
              Get a home screen icon and app-like experience
            </p>
          )}
        </div>
        {!isIOS && deferredPrompt && (
          <Button size="sm" onClick={handleInstall}>
            Install
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          {"\u2715"}
        </Button>
      </div>
    </div>
  );
}
