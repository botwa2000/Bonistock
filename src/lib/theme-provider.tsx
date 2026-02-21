"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "./auth-context";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    let theme: "DARK" | "LIGHT" = "DARK";

    if (user?.theme) {
      theme = user.theme;
    } else {
      const stored = localStorage.getItem("bonistock-theme");
      if (stored === "LIGHT") theme = "LIGHT";
    }

    if (theme === "LIGHT") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, [user?.theme, loading]);

  return <>{children}</>;
}
