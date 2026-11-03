import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearSession, loadSession, saveSession } from "../auth/session";
import type { SessionUser } from "../types";

const ADMIN_IDLE_MS = 30 * 60 * 1000;
const EMPLOYEE_IDLE_MS = 12 * 60 * 60 * 1000;
const ACTIVITY_KEY = "plano-activity";

type AuthContextValue = {
  user: SessionUser | null;
  login: (user: SessionUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => loadSession());

  const logout = useCallback(() => {
    clearSession();
    sessionStorage.removeItem(ACTIVITY_KEY);
    setUser(null);
  }, []);

  const login = useCallback((next: SessionUser) => {
    saveSession(next);
    sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    setUser(next);
  }, []);

  useEffect(() => {
    if (!user) return;
    const limit = user.role === "admin" ? ADMIN_IDLE_MS : EMPLOYEE_IDLE_MS;
    const mark = () => sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    if (!sessionStorage.getItem(ACTIVITY_KEY)) mark();
    window.addEventListener("pointerdown", mark);
    const timer = window.setInterval(() => {
      const at = Number(sessionStorage.getItem(ACTIVITY_KEY) || 0);
      if (!at || Date.now() - at > limit) logout();
    }, 60_000);
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.clearInterval(timer);
    };
  }, [user, logout]);

  const value = useMemo<AuthContextValue>(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth mora biti unutar AuthProvider");
  return ctx;
}
