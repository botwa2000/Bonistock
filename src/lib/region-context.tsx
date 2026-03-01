"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface RegionContextType {
  region: string;
  setRegion: (region: string) => void;
}

const RegionContext = createContext<RegionContextType>({
  region: "GLOBAL",
  setRegion: () => {},
});

function getRegionCookie(): string {
  if (typeof document === "undefined") return "GLOBAL";
  const match = document.cookie.match(/(?:^|;\s*)NEXT_REGION=([^;]*)/);
  return match?.[1] ?? "GLOBAL";
}

function setRegionCookie(region: string) {
  document.cookie = `NEXT_REGION=${region}; path=/; max-age=31536000; SameSite=Lax`;
}

/** Dispatch this event after writing the NEXT_REGION cookie from outside the context. */
export function dispatchRegionChange() {
  window.dispatchEvent(new Event("region-cookie-change"));
}

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState(() => getRegionCookie());

  const setRegion = useCallback((newRegion: string) => {
    setRegionCookie(newRegion);
    setRegionState(newRegion);
  }, []);

  // Sync when the cookie is written from outside the context (e.g. auth-context on login)
  useEffect(() => {
    const handler = () => setRegionState(getRegionCookie());
    window.addEventListener("region-cookie-change", handler);
    return () => window.removeEventListener("region-cookie-change", handler);
  }, []);

  return (
    <RegionContext.Provider value={{ region, setRegion }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  return useContext(RegionContext);
}
