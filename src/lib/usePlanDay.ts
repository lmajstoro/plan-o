import { useEffect, useMemo, useState } from "react";
import { useDb } from "../context/DbContext";
import { addWorkDays, formatDateKey, parseDateKey, todayWorkDate } from "./dates";
import { isEmployeeActive, isHoursConfirmed } from "./employee";
import type { Assignment } from "../types";

const SOPNICA_GROUP_ID = "wg-sopnica";
const SOPNICA_LOAD_MS = 1000;
export const SOPNICA_LOAD_MESSAGES = [
  "Učitavam zaposlenike",
  "Raspodjeljujem zadatke",
  "Usklađujem satnicu",
  "Pripremam plan rada",
];

export function usePlanDay() {
  const { db, update, reset } = useDb();
  const [date, setDate] = useState(() => formatDateKey(todayWorkDate()));
  const [groupFilter, setGroupFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [showPlanned, setShowPlanned] = useState(true);
  const [sopnicaStep, setSopnicaStep] = useState(0);
  const [sopnicaReady, setSopnicaReady] = useState(false);
  const current = parseDateKey(date);
  const sopnicaOnly = groupFilter.length === 1 && groupFilter[0] === SOPNICA_GROUP_ID;
  const sopnicaLoading = sopnicaOnly && !sopnicaReady;

  useEffect(() => {
    const yesterday = formatDateKey(addWorkDays(todayWorkDate(), -1));
    if (!db.assignments.some((row) => row.date === yesterday && row.kind === "actual")) {
      reset();
    }
  }, [db.assignments, reset]);

  useEffect(() => {
    if (!sopnicaOnly) {
      setSopnicaReady(false);
      setSopnicaStep(0);
      return;
    }

    setSopnicaReady(false);
    setSopnicaStep(0);
    const timers = SOPNICA_LOAD_MESSAGES.slice(1).map((_, index) =>
      window.setTimeout(() => setSopnicaStep(index + 1), (index + 1) * SOPNICA_LOAD_MS),
    );
    const done = window.setTimeout(() => setSopnicaReady(true), SOPNICA_LOAD_MESSAGES.length * SOPNICA_LOAD_MS);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(done);
    };
  }, [sopnicaOnly]);

  const allEmployees = useMemo(
    () =>
      [...db.employees]
        .filter(isEmployeeActive)
        .sort((a, b) => a.name.localeCompare(b.name, "hr")),
    [db.employees],
  );

  const employees = useMemo(() => {
    return allEmployees.filter((employee) => {
      const matchesGroup =
        groupFilter.length === 0 || employee.groupIds.some((id) => groupFilter.includes(id));
      const matchesRole =
        roleFilter.length === 0 || employee.roleIds.some((id) => roleFilter.includes(id));
      return matchesGroup && matchesRole;
    });
  }, [allEmployees, groupFilter, roleFilter]);

  const dayHasActuals = db.assignments.some((row) => row.date === date && row.kind === "actual");
  const confirmedEmployeeIds = useMemo(
    () =>
      (db.dayStatuses ?? [])
        .filter((row) => row.date === date && isHoursConfirmed(row.status))
        .map((row) => row.employeeId),
    [db.dayStatuses, date],
  );

  function go(delta: number) {
    setDate(formatDateKey(addWorkDays(current, delta)));
  }

  function goToday() {
    setDate(formatDateKey(todayWorkDate()));
  }

  function toggleGroup(id: string) {
    setGroupFilter((currentFilter) =>
      currentFilter.includes(id) ? currentFilter.filter((item) => item !== id) : [...currentFilter, id],
    );
  }

  function toggleRole(id: string) {
    setRoleFilter((currentFilter) =>
      currentFilter.includes(id) ? currentFilter.filter((item) => item !== id) : [...currentFilter, id],
    );
  }

  function commitEmployeeDay(employeeId: string, next: Assignment[]) {
    update((currentDb) => ({
      ...currentDb,
      assignments: [
        ...currentDb.assignments.filter(
          (row) => !(row.employeeId === employeeId && row.date === date && row.kind !== "actual"),
        ),
        ...next.map((row) => ({ ...row, kind: "planned" as const })),
      ],
    }));
  }

  return {
    db,
    update,
    date,
    current,
    go,
    goToday,
    groupFilter,
    roleFilter,
    clearGroups: () => setGroupFilter([]),
    clearRoles: () => setRoleFilter([]),
    toggleGroup,
    toggleRole,
    allEmployees,
    employees,
    dayHasActuals,
    showPlanned,
    toggleShowPlanned: () => setShowPlanned((value) => !value),
    confirmedEmployeeIds,
    sopnicaLoading,
    sopnicaStep,
    commitEmployeeDay,
  };
}
