import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { authenticate, clearSession, loadSession, saveSession } from "../auth/session";
import type { SessionUser, UserRole } from "../types";

type AuthContextValue = {
  user: SessionUser | null;
  login: (role: UserRole) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => loadSession());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: (role) => {
        const next = authenticate(role);
        if (!next) return false;
        saveSession(next);
        setUser(next);
        return true;
      },
      logout: () => {
        clearSession();
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth mora biti unutar AuthProvider");
  return ctx;
}
