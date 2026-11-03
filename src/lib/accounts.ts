import { newId } from "./gantt";
import type { Database, Employee } from "../types";

export const APP_VERSION = "0.9.0";
export const MOCK_PASSWORD = "Plan-O-demo-1";
export const MOCK_ADMIN_EMAIL = "ivan.vladic-administrator@gmail.com";
export const MOCK_EMPLOYEE_EMAIL = "ivan.vladic@plan-o.hr";
export const MOCK_MFA_CODE = "000000";
export const PASSWORD_MIN = 12;
export const LOCK_AFTER = 5;
const LINK_MS = 24 * 60 * 60 * 1000;

export function sameEmail(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
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
