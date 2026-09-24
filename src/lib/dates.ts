export const ROLE_LABELS: Record<import("../types").Role, string> = {
  montazer: "Montažer",
  serviser: "Serviser",
  elektromonter: "Elektromonter",
};

export const ROLES = ["montazer", "serviser", "elektromonter"] as const;

export const WEEKDAYS = [
  "nedjelja",
  "ponedjeljak",
  "utorak",
  "srijeda",
  "četvrtak",
  "petak",
  "subota",
] as const;

export const MONTHS_GENITIVE = [
  "siječnja",
  "veljače",
  "ožujka",
  "travnja",
  "svibnja",
  "lipnja",
  "srpnja",
  "kolovoza",
  "rujna",
  "listopada",
  "studenoga",
  "prosinca",
] as const;

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function toWorkDay(date: Date): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (next.getDay() === 6) next.setDate(next.getDate() + 2);
  if (next.getDay() === 0) next.setDate(next.getDate() + 1);
  return next;
}

export function addCalendarDays(date: Date, delta: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + delta);
  return next;
}

export function addWorkDays(date: Date, delta: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const step = delta > 0 ? 1 : -1;
  let remaining = Math.abs(delta);
  while (remaining > 0) {
    next.setDate(next.getDate() + step);
    if (!isWeekend(next)) remaining -= 1;
  }
  return next;
}

export function calendarToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function formatCroatianDate(date: Date): string {
  const weekday = WEEKDAYS[date.getDay()];
  const label = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${label}, ${date.getDate()}. ${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}.`;
}

export function todayWorkDate(): Date {
  return toWorkDay(new Date());
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
