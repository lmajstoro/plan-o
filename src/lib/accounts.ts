import { newId } from "./gantt";
import type { Database, Employee } from "../types";

export const APP_VERSION = "0.9.0";
export const MOCK_PASSWORD = "Plan-O-demo-1";
export const MOCK_ADMIN_EMAIL = "ivan.vladic-administrator@gmail.com";
export const MOCK_EMPLOYEE_EMAIL = "domagoj.takac@plan-o.hr";
export const MOCK_MFA_CODE = "000000";
export const PASSWORD_MIN = 12;
export const LOCK_AFTER = 5;
const LINK_MS = 24 * 60 * 60 * 1000;

export function sameEmail(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

/** First letter of the given name plus the surname, without diacritics. Domagoj Takač → dtakac. */
export function employeeLoginName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const folded = parts.map(foldLogin);
  if (folded.length === 1) return folded[0];
  return `${folded[0].slice(0, 1)}${folded[folded.length - 1]}`;
}

export function foldLogin(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[čćđšž]/g, (letter) => ({ č: "c", ć: "c", đ: "d", š: "s", ž: "z" })[letter] ?? letter)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

export function emailTaken(db: Database, email: string, exceptEmployeeId?: string): boolean {
  const key = email.trim().toLowerCase();
  return (
    db.employees.some((row) => row.id !== exceptEmployeeId && row.email.trim().toLowerCase() === key) ||
    db.administrators.some((row) => row.email.trim().toLowerCase() === key)
  );
}

export function passwordLink(employee: Employee, active: boolean): { employee: Employee; token: string } {
  const token = newId("tok");
  return {
    token,
    employee: {
      ...employee,
      active,
      resetToken: token,
      resetTokenExpires: new Date(Date.now() + LINK_MS).toISOString(),
      passwordResetSentAt: new Date().toISOString(),
    },
  };
}

export function activateEmployee(employee: Employee): { employee: Employee; token: string; welcome: boolean } {
  const welcome = !employee.welcomed;
  const issued = passwordLink(
    {
      ...employee,
      password: "",
      passwordSet: false,
      locked: false,
      failedLogins: 0,
      welcomed: true,
    },
    true,
  );
  return { ...issued, welcome };
}

export function linkExpired(expires: string | undefined, now = Date.now()): boolean {
  if (!expires) return true;
  return new Date(expires).getTime() < now;
}
