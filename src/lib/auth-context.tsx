"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Tier, Goal, UserRegion, PassDuration } from "./types";

interface AuthState {
  isLoggedIn: boolean;
  username: string;
  email: string;
  tier: Tier;
  goal: Goal;
  memberSince: string;
  region: UserRegion;
  passExpiry: string | null;
  passType: PassDuration | null;
  passActivationsRemaining: number;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => boolean;
  logout: () => void;
  setTier: (tier: Tier) => void;
  setGoal: (goal: Goal) => void;
  setRegion: (region: UserRegion) => void;
  purchasePass: (duration: PassDuration) => void;
  activatePassDay: () => void;
  isPassActive: () => boolean;
  canActivatePass: () => boolean;
}

const initialState: AuthState = {
  isLoggedIn: false,
  username: "",
  email: "",
  tier: "free",
  goal: "growth",
  memberSince: "",
  region: "us",
  passExpiry: null,
  passType: null,
  passActivationsRemaining: 0,
};

const passDays: Record<PassDuration, number> = {
  "1day": 1,
  "3day": 3,
  "12day": 12,
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  // Auto-revert to free when all activations used and current window expired
  useEffect(() => {
    if (
      state.tier === "pass" &&
      state.passActivationsRemaining === 0 &&
      state.passExpiry &&
      Date.now() >= new Date(state.passExpiry).getTime()
    ) {
      setState((prev) => ({
        ...prev,
        tier: "free",
        passExpiry: null,
        passType: null,
        passActivationsRemaining: 0,
      }));
    }
  }, [state.tier, state.passExpiry, state.passActivationsRemaining]);

  const login = useCallback((username: string, password: string): boolean => {
    if (username === "admin" && password === "admin") {
      setState({
        isLoggedIn: true,
        username: "admin",
        email: "admin@bonifatus.io",
        tier: "plus",
        goal: "growth",
        memberSince: "2026-01-01",
        region: "us",
        passExpiry: null,
        passType: null,
        passActivationsRemaining: 0,
      });
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setState(initialState);
  }, []);

  const setTier = useCallback((tier: Tier) => {
    setState((prev) => ({
      ...prev,
      tier,
      // Clear pass state when switching away from pass
      ...(tier !== "pass" && {
        passExpiry: null,
        passType: null,
        passActivationsRemaining: 0,
      }),
    }));
  }, []);

  const setGoal = useCallback((goal: Goal) => {
    setState((prev) => ({ ...prev, goal }));
  }, []);

  const setRegion = useCallback((region: UserRegion) => {
    setState((prev) => ({ ...prev, region }));
  }, []);

  // Purchase a pass: sets activations count, does NOT start a 24h window yet
  const purchasePass = useCallback((duration: PassDuration) => {
    const days = passDays[duration];
    setState((prev) => ({
      ...prev,
      tier: "pass",
      passType: duration,
      passActivationsRemaining: days,
      passExpiry: null,
    }));
  }, []);

  // Activate one 24-hour window, decrement remaining activations
  const activatePassDay = useCallback(() => {
    setState((prev) => {
      if (prev.passActivationsRemaining <= 0) return prev;
      // Don't allow re-activation while a window is still running
      if (prev.passExpiry && Date.now() < new Date(prev.passExpiry).getTime())
        return prev;
      const expiry = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();
      return {
        ...prev,
        tier: "pass",
        passExpiry: expiry,
        passActivationsRemaining: prev.passActivationsRemaining - 1,
      };
    });
  }, []);

  const isPassActive = useCallback((): boolean => {
    if (state.tier !== "pass" || !state.passExpiry) return false;
    return Date.now() < new Date(state.passExpiry).getTime();
  }, [state.tier, state.passExpiry]);

  const canActivatePass = useCallback((): boolean => {
    if (state.tier !== "pass") return false;
    if (state.passActivationsRemaining <= 0) return false;
    // Can't activate if a window is already running
    if (state.passExpiry && Date.now() < new Date(state.passExpiry).getTime())
      return false;
    return true;
  }, [state.tier, state.passActivationsRemaining, state.passExpiry]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        setTier,
        setGoal,
        setRegion,
        purchasePass,
        activatePassDay,
        isPassActive,
        canActivatePass,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
