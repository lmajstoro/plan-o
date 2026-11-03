import { useEffect, useMemo, useState } from "react";
import { useDb } from "../context/DbContext";
import { addWorkDays, formatDateKey, parseDateKey, todayWorkDate } from "./dates";
import { isEmployeeActive, isHoursConfirmed } from "./employee";
import { coversRole } from "./skills";
import type { Assignment } from "../types";

export function usePlanDay() {
  const { db, update, reset } = useDb();
  const [date, setDate] = useState(() => formatDateKey(todayWorkDate()));
  const [groupFilter, setGroupFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const current = parseDateKey(date);

  useEffect(() => {
    const yesterday = formatDateKey(addWorkDays(todayWorkDate(), -1));
    if (!db.assignments.some((row) => row.date === yesterday && row.kind === "actual")) {
      reset();
    }
  }, [db.assignments, reset]);

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
        roleFilter.length === 0 || roleFilter.some((id) => coversRole(employee, db.tasks, id));
      return matchesGroup && matchesRole;
    });
  }, [allEmployees, db.tasks, groupFilter, roleFilter]);

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
    confirmedEmployeeIds,
    commitEmployeeDay,
  };
}
