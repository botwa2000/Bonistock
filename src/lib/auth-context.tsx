"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
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
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => boolean;
  logout: () => void;
  setTier: (tier: Tier) => void;
  setGoal: (goal: Goal) => void;
  setRegion: (region: UserRegion) => void;
  activatePass: (duration: PassDuration) => void;
  isPassActive: () => boolean;
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
};

const passHours: Record<PassDuration, number> = {
  "1day": 24,
  "3day": 72,
  "12day": 288,
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

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
      });
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setState(initialState);
  }, []);

  const setTier = useCallback((tier: Tier) => {
    setState((prev) => ({ ...prev, tier }));
  }, []);

  const setGoal = useCallback((goal: Goal) => {
    setState((prev) => ({ ...prev, goal }));
  }, []);

  const setRegion = useCallback((region: UserRegion) => {
    setState((prev) => ({ ...prev, region }));
  }, []);

  const activatePass = useCallback((duration: PassDuration) => {
    const hours = passHours[duration];
    const expiry = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    setState((prev) => ({
      ...prev,
      tier: "pass",
      passExpiry: expiry,
      passType: duration,
    }));
  }, []);

  const isPassActive = useCallback((): boolean => {
    if (state.tier !== "pass" || !state.passExpiry) return false;
    return Date.now() < new Date(state.passExpiry).getTime();
  }, [state.tier, state.passExpiry]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        setTier,
        setGoal,
        setRegion,
        activatePass,
        isPassActive,
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
