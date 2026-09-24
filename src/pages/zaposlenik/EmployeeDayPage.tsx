import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DayCalendar } from "../../components/employee/DayCalendar";
import { EmployeeAssignmentSheet } from "../../components/employee/EmployeeAssignmentSheet";
import { ChevronLeftIcon, ChevronRightIcon, LogoutIcon } from "../../components/icons";
import { useAuth } from "../../context/AuthContext";
import { useDb } from "../../context/DbContext";
import { addCalendarDays, formatCroatianDate, formatDateKey, parseDateKey, ROLE_LABELS } from "../../lib/dates";
import {
  canViewDay,
  dayAssignments,
  dayModeLabel,
  dayTone,
  findEmployeeForUser,
  isEditableDay,
  isRestDay,
  maxViewKey,
  minViewKey,
  REST_DAY_MESSAGE,
  todayKey,
} from "../../lib/employee";
import { blockEnd, DAY_END, DAY_START, newId } from "../../lib/gantt";
import { isArchivedWorkOrder, tasksForWorkOrder } from "../../lib/workOrders";
import type { Assignment } from "../../types";

type SheetState =
  | { mode: "create"; startHour: number; durationHours: number }
  | { mode: "edit"; assignment: Assignment };

export function EmployeeDayPage() {
  const { user, logout } = useAuth();
  const { db, update } = useDb();
  const navigate = useNavigate();
  const [date, setDate] = useState(() => todayKey());
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [error, setError] = useState("");

  const employee = user ? findEmployeeForUser(db.employees, user) : undefined;
  const current = parseDateKey(date);
  const editable = isEditableDay(date);
  const restDay = isRestDay(date);
  const tone = dayTone(date);
  const canGoBack = formatDateKey(addCalendarDays(current, -1)) >= minViewKey();
  const canGoForward = formatDateKey(addCalendarDays(current, 1)) <= maxViewKey();

  const assignments = useMemo(
    () => (employee ? dayAssignments(db.assignments, employee.id, date) : []),
    [db.assignments, employee, date],
  );

  function go(delta: number) {
    const next = formatDateKey(addCalendarDays(current, delta));
    if (!canViewDay(next)) return;
    setDate(next);
    setSheet(null);
    setError("");
  }

  function overlaps(next: Assignment[]): boolean {
    const sorted = [...next].sort((a, b) => a.startHour - b.startHour);
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].startHour < blockEnd(sorted[index - 1])) return true;
    }
    return false;
  }

  function commit(next: Assignment[]): boolean {
    if (!employee) return false;
    const invalid = next.some(
      (row) => row.startHour < DAY_START || blockEnd(row) > DAY_END || row.durationHours < 1,
    );
    const usesArchived = next.some((row) => {
      const order = db.workOrders.find((item) => item.id === row.workOrderId);
      return isArchivedWorkOrder(order);
    });
    const invalidTask = next.some((row) => {
      const order = db.workOrders.find((item) => item.id === row.workOrderId);
      return !tasksForWorkOrder(order, db.tasks, employee.role).some((task) => task.id === row.taskId);
    });
    if (invalid || overlaps(next) || usesArchived || invalidTask) {
      setError(
        usesArchived
          ? "Na arhivirani nalog se ne mogu unositi sati."
          : invalidTask
            ? "Odabrani zadatak nije dostupan na tom nalogu."
            : "Vrijeme se preklapa ili izlazi iz radnog dana.",
      );
      return false;
    }
    update((currentDb) => ({
      ...currentDb,
      assignments: [
        ...currentDb.assignments.filter(
          (row) => !(row.employeeId === employee.id && row.date === date && row.kind === "actual"),
        ),
        ...next.map((row) => ({
          ...row,
          id: row.kind === "actual" ? row.id : newId("asg"),
          employeeId: employee.id,
          date,
          kind: "actual" as const,
        })),
      ],
    }));
    setSheet(null);
    setError("");
    return true;
  }

  function saveSheet(workOrderId: string, taskId: string, startHour: number, durationHours: number) {
    if (!sheet) return;
    if (sheet.mode === "create") {
      commit([
        ...assignments,
        {
          id: newId("asg"),
          employeeId: employee?.id ?? "",
          date,
          workOrderId,
          taskId,
          startHour,
          durationHours,
          kind: "actual",
        },
      ]);
      return;
    }
    commit(
      assignments.map((row) =>
        row.id === sheet.assignment.id ? { ...row, workOrderId, taskId, startHour, durationHours } : row,
      ),
    );
  }

  function deleteSheet() {
    if (sheet?.mode !== "edit") return;
    commit(assignments.filter((row) => row.id !== sheet.assignment.id));
  }

  if (!user || !employee) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4">
        <p className="text-slate-600">Zaposlenik nije pronađen u planu.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white shadow-sm">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between px-4 pb-2">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-slate-900">{employee.name}</div>
            <div className="text-xs text-slate-500">{ROLE_LABELS[employee.role]}</div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-slate-600"
            onClick={() => {
              logout();
              navigate("/prijava");
            }}
          >
            <LogoutIcon className="h-5 w-5" />
            Odjava
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 pb-3">
          <button type="button" className="icon-btn disabled:opacity-30" disabled={!canGoBack} onClick={() => go(-1)} aria-label="Prethodni dan">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-sm font-semibold text-slate-900">{formatCroatianDate(current)}</div>
          </div>
          <button type="button" className="icon-btn disabled:opacity-30" disabled={!canGoForward} onClick={() => go(1)} aria-label="Sljedeći dan">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`px-4 py-2 text-sm ${
            restDay
              ? "bg-slate-50 text-slate-600"
              : tone === "live"
                ? "bg-blue-50 text-blue-900"
                : tone === "future"
                  ? "bg-slate-50 text-slate-500"
                  : "bg-slate-100 text-slate-500"
          }`}
        >
          {dayModeLabel(date)}
          {editable ? " · dodirni zadatak ili prazan sat." : null}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        {restDay ? (
          <p className="px-6 py-16 text-center text-base font-medium text-slate-600">{REST_DAY_MESSAGE}</p>
        ) : (
          <>
            {assignments.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Nema zadataka za ovaj dan.</p>
            ) : null}
            <DayCalendar
              assignments={assignments}
              workOrders={db.workOrders}
              tasks={db.tasks}
              tone={tone}
              showNow={date === todayKey()}
              onSelectAssignment={(assignment) => {
                setError("");
                setSheet({ mode: "edit", assignment });
              }}
              onSelectHour={(hour) => {
                setError("");
                setSheet({ mode: "create", startHour: hour, durationHours: 1 });
              }}
            />
          </>
        )}
      </div>

      {sheet && editable ? (
        <EmployeeAssignmentSheet
          title={sheet.mode === "create" ? "Novi zadatak" : "Uredi zadatak"}
          startHour={sheet.mode === "create" ? sheet.startHour : sheet.assignment.startHour}
          durationHours={sheet.mode === "create" ? sheet.durationHours : sheet.assignment.durationHours}
          workOrders={db.workOrders}
          tasks={db.tasks}
          role={employee.role}
          initialWorkOrderId={sheet.mode === "edit" ? sheet.assignment.workOrderId : undefined}
          initialTaskId={sheet.mode === "edit" ? sheet.assignment.taskId : undefined}
          error={error}
          onClose={() => {
            setSheet(null);
            setError("");
          }}
          onSave={saveSheet}
          onDelete={sheet.mode === "edit" ? deleteSheet : undefined}
        />
      ) : null}
    </div>
  );
}
