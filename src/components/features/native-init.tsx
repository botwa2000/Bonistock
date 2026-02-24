"use client";

import { useEffect } from "react";
import { isNative, configureStatusBar, addAppLifecycleListeners } from "@/lib/native";

export function NativeInit() {
  useEffect(() => {
    if (!isNative) return;

    configureStatusBar();

    addAppLifecycleListeners({
      onResume: () => {
        // Session refresh on app foreground — triggers re-render via auth context
        document.dispatchEvent(new Event("visibilitychange"));
      },
    });
  }, []);

  return null;
}
