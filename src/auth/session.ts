import { DEMO_ACCOUNTS } from "../data/seed";
import type { SessionUser } from "../types";

const SESSION_KEY = "plano-session";

export function loadSession(): SessionUser | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed.email || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(user: SessionUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function authenticate(email: string, password: string): SessionUser | null {
  const match = DEMO_ACCOUNTS.find(
    (account) => account.email.toLowerCase() === email.trim().toLowerCase() && account.password === password,
  );
  if (!match) return null;
  return { email: match.email, role: match.role, name: match.name };
}
