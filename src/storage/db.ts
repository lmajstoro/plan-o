import { createSeedDatabase } from "../data/seed";
import { addWorkDays, formatDateKey, todayWorkDate } from "../lib/dates";
import type { Database } from "../types";

const DB_KEY = "plano-db";
const SEED_VERSION_KEY = "plano-seed-version";
export const SEED_VERSION = "24";

function writeSeed(): Database {
  const seeded = createSeedDatabase();
  saveDatabase(seeded);
  localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
  return seeded;
}

function hasRecentActuals(db: Database): boolean {
  const yesterday = formatDateKey(addWorkDays(todayWorkDate(), -1));
  return db.assignments.some((row) => row.date === yesterday && row.kind === "actual");
}

function hasWorkOrderSchema(db: Database): boolean {
  return db.workOrders.every(
    (row) => Boolean(row.status) && Array.isArray(row.taskIds) && typeof row.archived === "boolean",
  );
}

export function loadDatabase(): Database {
  const version = localStorage.getItem(SEED_VERSION_KEY);
  const raw = localStorage.getItem(DB_KEY);
  if (!raw || version !== SEED_VERSION) return writeSeed();
  try {
    const parsed = JSON.parse(raw) as Database;
    if (!parsed.employees || !parsed.tasks || !parsed.workOrders || !parsed.assignments || !parsed.workGroups) {
      throw new Error("invalid");
    }
    if (!Array.isArray(parsed.jobRoles) || parsed.jobRoles.length === 0) return writeSeed();
    if (!parsed.employees.every((row) => Array.isArray(row.roleIds))) return writeSeed();
    if (!parsed.jobRoles.every((row) => typeof row.color === "string")) return writeSeed();
    if (!parsed.tasks.every((row) => typeof row.description === "string")) return writeSeed();
    if (!Array.isArray(parsed.workOrderTemplates) || parsed.workOrderTemplates.length === 0) return writeSeed();
    if (!parsed.workOrders.every((row) => Boolean(row.templateId))) return writeSeed();
    if (!hasRecentActuals(parsed) || !hasWorkOrderSchema(parsed)) return writeSeed();
    if (!Array.isArray(parsed.dayStatuses)) parsed.dayStatuses = [];
    return parsed;
  } catch {
    return writeSeed();
  }
}

export function saveDatabase(db: Database): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function resetDatabase(): Database {
  return writeSeed();
}
