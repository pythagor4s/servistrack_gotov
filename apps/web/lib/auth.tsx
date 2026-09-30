"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { SessionUser, UserPreferences } from "@servis-track/shared";
import { apiGet, apiPost } from "./api";

type AuthState = { user: SessionUser | null; loading: boolean };
type AuthContextValue = AuthState & {
  isAdmin: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  applyPreferences: (patch: Partial<UserPreferences>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const user = await apiGet<SessionUser>("/auth/me");
      setState({ user, loading: false });
    } catch {
      setState({ user: null, loading: false });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost("/auth/logout");
    } finally {
      setState({ user: null, loading: false });
      router.push("/prijava");
    }
  }, [router]);

  const applyPreferences = useCallback((patch: Partial<UserPreferences>) => {
    setState((s) =>
      s.user
        ? { ...s, user: { ...s.user, preferences: { ...s.user.preferences, ...patch } } }
        : s,
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAdmin: state.user?.role === "ADMIN",
        refresh,
        logout,
        applyPreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
