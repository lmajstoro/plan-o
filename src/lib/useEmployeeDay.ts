import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDb } from "../context/DbContext";
import { addCalendarDays, formatDateKey, formatHour, parseDateKey } from "./dates";
import {
  canViewDay,
  clearDayStatus,
  dayModeLabel,
  dayTone,
  findEmployeeForUser,
  hourStatusFor,
  isEditableDay,
  isEmployeeActive,
  isHoursConfirmed,
  isRestDay,
  maxViewKey,
  minViewKey,
  todayKey,
  upsertDayStatus,
} from "./employee";
import {
  blockEnd,
  blocksShifted,
  DAY_END,
  DAY_START,
  EXPECTED_HOURS,
  fitAroundTarget,
  gapErrorMessage,
  newId,
  overlapErrorMessage,
  totalHours,
} from "./gantt";
import { isArchivedWorkOrder, sortWorkOrdersForEmployeeDay, tasksForWorkOrder } from "./workOrders";
import type { Assignment, HourStatus } from "../types";

export const EMPTY_DAY_MESSAGE = "Upiši barem jedan unos sati prije potvrde.";

/** Query parameter that keeps the viewed day when the demo switches between variants. */
export const DATE_PARAM = "dan";
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export type EntryDraft = {
  workOrderId: string;
  taskId: string;
  startHour: number;
  durationHours: number;
};

/**
 * "fit" keeps every entry at the time the employee chose and pushes neighbours aside on overlap.
 * "chain" treats the day as entries in a row that start at the current day start, so gaps and
 * overlaps cannot happen. Both go through the same validation.
 */
export type CommitMode = "fit" | "chain";

export type HoursTone = "ok" | "under" | "over";

function sortByStart(rows: Assignment[]): Assignment[] {
  return [...rows].sort((a, b) => a.startHour - b.startHour || a.id.localeCompare(b.id));
}

/** Lays entries back to back from `anchor`, in their current order, keeping each length. */
function chainFrom(rows: Assignment[], anchor: number): Assignment[] {
  let cursor = anchor;
  return sortByStart(rows).map((row) => {
    const placed = { ...row, startHour: cursor };
    cursor += row.durationHours;
    return placed;
  });
}

function sameAsPlan(actuals: Assignment[], planned: Assignment[]): boolean {
  if (actuals.length !== planned.length) return false;
  const a = sortByStart(actuals);
  const p = sortByStart(planned);
  return a.every(
    (row, index) =>
      row.workOrderId === p[index].workOrderId &&
      row.taskId === p[index].taskId &&
      row.startHour === p[index].startHour &&
      row.durationHours === p[index].durationHours,
  );
}

export function hoursTone(hours: number): HoursTone {
  if (hours === EXPECTED_HOURS) return "ok";
  return hours > EXPECTED_HOURS ? "over" : "under";
}

export const HOURS_TONE_TEXT: Record<HoursTone, string> = {
  ok: "text-emerald-700",
  under: "text-amber-700",
  over: "text-red-600",
};

export function useEmployeeDay() {
  const { user, logout } = useAuth();
  const { db, update, reset } = useDb();
  const [params, setParams] = useSearchParams();
  const requested = params.get(DATE_PARAM);
  const date = requested && DATE_KEY.test(requested) && canViewDay(requested) ? requested : todayKey();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const employee = user ? findEmployeeForUser(db.employees, user) : undefined;
  const active = employee ? isEmployeeActive(employee) : false;
  const current = parseDateKey(date);
  const restDay = isRestDay(date);
  const editable = isEditableDay(date);
  const tone = dayTone(date);
  const isToday = date === todayKey();
  const hourStatus: HourStatus = employee ? hourStatusFor(db.dayStatuses, employee.id, date) : "nisu_uneseni";
  const confirmed = isHoursConfirmed(hourStatus);
  const canEdit = Boolean(employee) && active && editable && !confirmed;
  const canGoBack = formatDateKey(addCalendarDays(current, -1)) >= minViewKey();
  const canGoForward = formatDateKey(addCalendarDays(current, 1)) <= maxViewKey();

  const mine = useMemo(
    () => (employee ? db.assignments.filter((row) => row.employeeId === employee.id && row.date === date) : []),
    [db.assignments, employee, date],
  );
  const planned = useMemo(() => sortByStart(mine.filter((row) => row.kind !== "actual")), [mine]);
  const actuals = useMemo(() => sortByStart(mine.filter((row) => row.kind === "actual")), [mine]);
  const plannedHours = totalHours(planned);
  const workedHours = totalHours(actuals);
  const gapText = gapErrorMessage(actuals);
  const confirmBlocker = actuals.length === 0 ? EMPTY_DAY_MESSAGE : gapText;
  const nextFreeHour = actuals.length > 0 ? blockEnd(actuals[actuals.length - 1]) : null;

  const dayWorkOrderIds = useMemo(
    () => [...planned, ...actuals].map((row) => row.workOrderId),
    [planned, actuals],
  );
  const plannedOrderIds = useMemo(() => new Set(planned.map((row) => row.workOrderId)), [planned]);

  function orderById(id: string) {
    return db.workOrders.find((row) => row.id === id);
  }

  function taskById(id: string) {
    return db.tasks.find((row) => row.id === id);
  }

  function orderOptions(currentId?: string) {
    return sortWorkOrdersForEmployeeDay(db.workOrders, dayWorkOrderIds, currentId);
  }

  function tasksFor(workOrderId: string) {
    if (!employee) return [];
    return [...tasksForWorkOrder(orderById(workOrderId), db.tasks, employee.roleIds)].sort((a, b) =>
      a.code.localeCompare(b.code, "hr"),
    );
  }

  function clearMessages() {
    setError("");
    setNotice("");
  }

  function setDate(next: string) {
    setParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        if (next === todayKey()) nextParams.delete(DATE_PARAM);
        else nextParams.set(DATE_PARAM, next);
        return nextParams;
      },
      { replace: true },
    );
  }

  function go(delta: number) {
    const next = formatDateKey(addCalendarDays(current, delta));
    if (!canViewDay(next)) return;
    setDate(next);
    clearMessages();
  }

  function goToday() {
    setDate(todayKey());
    clearMessages();
  }

  function fail(message: string): false {
    setNotice("");
    setError(message);
    return false;
  }

  function commit(next: Assignment[], targetId: string | undefined, mode: CommitMode, anchorStart?: number): boolean {
    if (!employee || !canEdit) return false;
    const anchor = anchorStart ?? actuals[0]?.startHour ?? sortByStart(next)[0]?.startHour ?? DAY_START;
    let toSave = mode === "chain" ? chainFrom(next, anchor) : next;

    const outOfDay = toSave.some(
      (row) => row.startHour < DAY_START || blockEnd(row) > DAY_END || row.durationHours < 1,
    );
    const usesArchived = toSave.some((row) => isArchivedWorkOrder(orderById(row.workOrderId)));
    const invalidTask = toSave.some(
      (row) => !tasksForWorkOrder(orderById(row.workOrderId), db.tasks, employee.roleIds).some((task) => task.id === row.taskId),
    );
    if (usesArchived) return fail("Na arhivirani nalog se ne mogu unositi sati.");
    if (invalidTask) return fail("Odabrani zadatak nije dostupan na tom nalogu.");
    if (outOfDay) {
      return fail(
        mode === "chain"
          ? `Ne stane u radni dan. Zadnji unos može završiti najkasnije u ${formatHour(DAY_END)}.`
          : `Unos izlazi iz radnog dana. Rad može biti od ${formatHour(DAY_START)} do ${formatHour(DAY_END)}.`,
      );
    }

    const overlapText = mode === "fit" && targetId ? overlapErrorMessage(toSave, targetId) : null;
    let shifted = false;
    if (overlapText && targetId) {
      const fitted = fitAroundTarget(toSave, targetId);
      if (!fitted) return fail(`${overlapText} Raspored se ne može presložiti unutar radnog dana.`);
      shifted = blocksShifted(toSave, fitted);
      toSave = fitted;
    }

    update((currentDb) => ({
      ...currentDb,
      assignments: [
        ...currentDb.assignments.filter(
          (row) => !(row.employeeId === employee.id && row.date === date && row.kind === "actual"),
        ),
        ...toSave.map((row) => ({ ...row, employeeId: employee.id, date, kind: "actual" as const })),
      ],
    }));
    setError("");
    setNotice(shifted && overlapText ? `${overlapText} Ostali unosi su pomaknuti.` : "");
    return true;
  }

  function addEntry(draft: EntryDraft, mode: CommitMode = "fit"): boolean {
    if (!employee) return false;
    const created: Assignment = { id: newId("asg"), employeeId: employee.id, date, kind: "actual", ...draft };
    return commit([...actuals, created], created.id, mode);
  }

  function updateEntry(id: string, draft: EntryDraft, mode: CommitMode = "fit"): boolean {
    return commit(
      actuals.map((row) => (row.id === id ? { ...row, ...draft } : row)),
      id,
      mode,
    );
  }

  function deleteEntry(id: string, mode: CommitMode = "fit"): boolean {
    return commit(
      actuals.filter((row) => row.id !== id),
      undefined,
      mode,
    );
  }

  /** Replaces all entries of the day at once, reusing ids of entries that did not change. */
  function replaceEntries(drafts: EntryDraft[]): boolean {
    if (!employee) return false;
    const unused = [...actuals];
    const next = drafts.map((draft) => {
      const index = unused.findIndex(
        (row) =>
          row.workOrderId === draft.workOrderId &&
          row.taskId === draft.taskId &&
          row.startHour === draft.startHour &&
          row.durationHours === draft.durationHours,
      );
      const id = index >= 0 ? unused.splice(index, 1)[0].id : newId("asg");
      return { id, employeeId: employee.id, date, kind: "actual" as const, ...draft };
    });
    return commit(next, undefined, "fit");
  }

  /** Moves the whole day so the first entry starts at `hour`, keeping the order and lengths. */
  function setDayStart(hour: number): boolean {
    if (actuals.length === 0) return false;
    if (hour === actuals[0].startHour && !gapText) return true;
    return commit(actuals, undefined, "chain", hour);
  }

  function confirm(): boolean {
    if (!employee || !canEdit) return false;
    if (confirmBlocker) {
      setNotice("");
      setError(confirmBlocker);
      return false;
    }
    const status: HourStatus = sameAsPlan(actuals, planned) ? "potvrdeni" : "uredeni_i_potvrdeni";
    update((currentDb) => ({
      ...currentDb,
      dayStatuses: upsertDayStatus(currentDb.dayStatuses, employee.id, date, status),
    }));
    clearMessages();
    return true;
  }

  /** Entered hours are always the employee's own, so unconfirming keeps them for further editing. */
  function unconfirm() {
    if (!employee || !active || !editable || !confirmed) return;
    update((currentDb) => ({
      ...currentDb,
      dayStatuses: clearDayStatus(currentDb.dayStatuses, employee.id, date),
    }));
    clearMessages();
  }

  function resetTestData() {
    reset();
    setDate(todayKey());
    clearMessages();
  }

  return {
    db,
    user,
    logout,
    employee,
    active,
    date,
    current,
    isToday,
    restDay,
    editable,
    tone,
    modeLabel: dayModeLabel(date),
    hourStatus,
    confirmed,
    canEdit,
    canGoBack,
    canGoForward,
    planned,
    actuals,
    plannedHours,
    workedHours,
    workedTone: hoursTone(workedHours),
    gapText,
    confirmBlocker,
    nextFreeHour,
    plannedOrderIds,
    error,
    notice,
    setError,
    clearMessages,
    orderById,
    taskById,
    orderOptions,
    tasksFor,
    go,
    goToday,
    addEntry,
    updateEntry,
    deleteEntry,
    replaceEntries,
    setDayStart,
    confirm,
    unconfirm,
    resetTestData,
  };
}

export type EmployeeDay = ReturnType<typeof useEmployeeDay>;
