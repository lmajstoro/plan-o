import type { Assignment, Employee, SessionUser } from "../types";
import { addWorkDays, formatDateKey, todayWorkDate } from "./dates";

export const MAX_FUTURE_WORK_DAYS = 3;
export const MAX_PAST_WORK_DAYS = 21;

export function findEmployeeForUser(employees: Employee[], user: SessionUser): Employee | undefined {
  const email = user.email.trim().toLowerCase();
  return (
    employees.find((row) => row.email.toLowerCase() === email) ??
    employees.find((row) => row.name === user.name) ??
    employees.find((row) => row.name === "Ivan Vladić")
  );
}

export function todayKey(): string {
  return formatDateKey(todayWorkDate());
}

export function yesterdayKey(): string {
  return formatDateKey(addWorkDays(todayWorkDate(), -1));
}

export function minViewKey(): string {
  return formatDateKey(addWorkDays(todayWorkDate(), -MAX_PAST_WORK_DAYS));
}

export function maxViewKey(): string {
  return formatDateKey(addWorkDays(todayWorkDate(), MAX_FUTURE_WORK_DAYS));
}

export function isEditableDay(dateKey: string): boolean {
  return dateKey === todayKey() || dateKey === yesterdayKey();
}

export function dayTone(dateKey: string): "live" | "past" | "future" {
  if (isEditableDay(dateKey)) return "live";
  if (dateKey > todayKey()) return "future";
  return "past";
}

export function canViewDay(dateKey: string): boolean {
  return dateKey >= minViewKey() && dateKey <= maxViewKey();
}

export function dayAssignments(assignments: Assignment[], employeeId: string, date: string): Assignment[] {
  const mine = assignments.filter((row) => row.employeeId === employeeId && row.date === date);
  const actuals = mine.filter((row) => row.kind === "actual");
  if (actuals.length > 0) return actuals;
  return mine.filter((row) => row.kind !== "actual");
}

export function dayModeLabel(dateKey: string): string {
  if (dateKey === todayKey()) return "Možeš urediti današnji dan";
  if (dateKey === yesterdayKey()) return "Možeš urediti jučerašnji dan";
  if (dateKey > todayKey()) return "Samo pregled, nadolazeći dan";
  return "Samo pregled, prethodni dan";
}
