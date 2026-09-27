import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DayCalendar } from "../../components/employee/DayCalendar";
import { EmployeeAssignmentSheet } from "../../components/employee/EmployeeAssignmentSheet";
import { ConfirmDialog } from "../../components/ui/Modal";
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon, LogoutIcon } from "../../components/icons";
import { useAuth } from "../../context/AuthContext";
import { useDb } from "../../context/DbContext";
import { addCalendarDays, formatCroatianDate, formatDateKey, parseDateKey } from "../../lib/dates";
import {
  canViewDay,
  clearDayStatus,
  dayAssignments,
  dayModeLabel,
  dayTone,
  findEmployeeForUser,
  hourStatusFor,
  isEditableDay,
  isHoursConfirmed,
  isRestDay,
  maxViewKey,
  minViewKey,
  REST_DAY_MESSAGE,
  todayKey,
  upsertDayStatus,
} from "../../lib/employee";
import {
  blockEnd,
  blocksShifted,
  closeWorkGaps,
  DAY_END,
  DAY_START,
  EXPECTED_HOURS,
  fitAroundTarget,
  gapErrorMessage,
  newId,
  overlapErrorMessage,
  totalHours,
  workGaps,
} from "../../lib/gantt";
import { isArchivedWorkOrder, tasksForWorkOrder } from "../../lib/workOrders";
import { assignedRoles } from "../../lib/roles";
import type { Assignment } from "../../types";

type SheetState =
  | { mode: "create"; startHour: number; durationHours: number }
  | { mode: "edit"; assignment: Assignment };

export function EmployeeDayPage() {
  const { user, logout } = useAuth();
  const { db, update, reset } = useDb();
  const navigate = useNavigate();
  const [date, setDate] = useState(() => todayKey());
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetOpen, setResetOpen] = useState(false);

  const employee = user ? findEmployeeForUser(db.employees, user) : undefined;
  const current = parseDateKey(date);
  const editable = isEditableDay(date);
  const restDay = isRestDay(date);
  const tone = dayTone(date);
  const hourStatus = employee ? hourStatusFor(db.dayStatuses, employee.id, date) : "nisu_uneseni";
  const confirmed = isHoursConfirmed(hourStatus);
  const canEdit = editable && !confirmed;
  const canGoBack = formatDateKey(addCalendarDays(current, -1)) >= minViewKey();
  const canGoForward = formatDateKey(addCalendarDays(current, 1)) <= maxViewKey();

  const assignments = useMemo(
    () => (employee ? dayAssignments(db.assignments, employee.id, date) : []),
    [db.assignments, employee, date],
  );
  const workedHours = totalHours(assignments);
  const hoursTone =
    workedHours === EXPECTED_HOURS ? "text-emerald-700" : workedHours > EXPECTED_HOURS ? "text-red-600" : "text-amber-700";
  const dayWorkOrderIds = useMemo(
    () => [...assignments].sort((a, b) => a.startHour - b.startHour).map((row) => row.workOrderId),
    [assignments],
  );
  const sheetOtherHours =
    sheet?.mode === "edit"
      ? totalHours(assignments.filter((row) => row.id !== sheet.assignment.id))
      : workedHours;

  function go(delta: number) {
    const next = formatDateKey(addCalendarDays(current, delta));
    if (!canViewDay(next)) return;
    setDate(next);
    setSheet(null);
    setError("");
    setNotice("");
  }

  function commit(next: Assignment[], targetId?: string): boolean {
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
      return !tasksForWorkOrder(order, db.tasks, employee.roleIds).some((task) => task.id === row.taskId);
    });
    if (invalid || usesArchived || invalidTask) {
      setError(
        usesArchived
          ? "Na arhivirani nalog se ne mogu unositi sati."
          : invalidTask
            ? "Odabrani zadatak nije dostupan na tom nalogu."
            : "Zadatak izlazi iz radnog dana.",
      );
      return false;
    }
    const overlapText = targetId ? overlapErrorMessage(next, targetId) : null;
    let toSave = next;
    let shifted = false;
    if (overlapText && targetId) {
      const fitted = fitAroundTarget(next, targetId);
      if (!fitted) {
        setError(`${overlapText} Raspored se ne može presložiti unutar radnog dana.`);
        return false;
      }
      toSave = fitted;
      shifted = blocksShifted(next, fitted);
    }
    if (!targetId && workGaps(toSave).length > 0) {
      const packed = closeWorkGaps(toSave);
      shifted = shifted || blocksShifted(toSave, packed);
      toSave = packed;
    }
    const gapText = gapErrorMessage(toSave);
    if (gapText) {
      setError(gapText);
      return false;
    }
    update((currentDb) => ({
      ...currentDb,
      assignments: [
        ...currentDb.assignments.filter(
          (row) => !(row.employeeId === employee.id && row.date === date && row.kind === "actual"),
        ),
        ...toSave.map((row) => ({
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
    setNotice(
      shifted && overlapText
        ? `${overlapText} Raspored je presložen.`
        : shifted && !targetId
          ? "Rupa u radu je zatvorena."
          : "",
    );
    return true;
  }

  function confirmHours() {
    if (!employee || !canEdit) return;
    const gapText = gapErrorMessage(assignments);
    if (gapText) {
      setNotice("");
      setError(gapText);
      return;
    }
    const hadActuals = db.assignments.some(
      (row) => row.employeeId === employee.id && row.date === date && row.kind === "actual",
    );
    update((currentDb) => {
      const planned = currentDb.assignments.filter(
        (row) => row.employeeId === employee.id && row.date === date && row.kind !== "actual",
      );
      const assignments = hadActuals
        ? currentDb.assignments
        : [
            ...currentDb.assignments,
            ...planned.map((row) => ({ ...row, id: newId("asg"), kind: "actual" as const })),
          ];
      return {
        ...currentDb,
        assignments,
        dayStatuses: upsertDayStatus(
          currentDb.dayStatuses,
          employee.id,
          date,
          hadActuals ? "uredeni_i_potvrdeni" : "potvrdeni",
        ),
      };
    });
    setSheet(null);
    setError("");
    setNotice("");
  }

  function unconfirmHours() {
    if (!employee || !editable || !confirmed) return;
    update((currentDb) => ({
      ...currentDb,
      assignments:
        hourStatus === "potvrdeni"
          ? currentDb.assignments.filter(
              (row) => !(row.employeeId === employee.id && row.date === date && row.kind === "actual"),
            )
          : currentDb.assignments,
      dayStatuses: clearDayStatus(currentDb.dayStatuses, employee.id, date),
    }));
  }

  function saveSheet(workOrderId: string, taskId: string, startHour: number, durationHours: number) {
    if (!sheet) return;
    if (sheet.mode === "create") {
      const created = {
        id: newId("asg"),
        employeeId: employee?.id ?? "",
        date,
        workOrderId,
        taskId,
        startHour,
        durationHours,
        kind: "actual" as const,
      };
      commit([...assignments, created], created.id);
      return;
    }
    commit(
      assignments.map((row) =>
        row.id === sheet.assignment.id ? { ...row, workOrderId, taskId, startHour, durationHours } : row,
      ),
      sheet.assignment.id,
    );
  }

  function resetTestData() {
    reset();
    setDate(todayKey());
    setSheet(null);
    setError("");
    setNotice("");
    setResetOpen(false);
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
            <button
              type="button"
              className="block w-full truncate text-left text-base font-semibold text-slate-900"
              onClick={() => setResetOpen(true)}
            >
              {employee.name}
            </button>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              {assignedRoles(db.jobRoles, employee.roleIds).map((role) => (
                <span key={role.id} className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: role.color }} />
                  {role.name}
                </span>
              ))}
            </div>
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
            {!restDay ? <div className={`text-xs font-medium ${hoursTone}`}>Ukupno {workedHours} h</div> : null}
          </div>
          <button type="button" className="icon-btn disabled:opacity-30" disabled={!canGoForward} onClick={() => go(1)} aria-label="Sljedeći dan">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        {!confirmed ? (
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
            {canEdit ? " · dodirni zadatak ili prazan sat." : null}
          </div>
        ) : null}
      </header>

      <div className={`flex-1 ${sheet ? "overflow-hidden" : "overflow-y-auto"} pb-[max(7rem,env(safe-area-inset-bottom))]`}>
        {notice ? (
          <p className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>
        ) : null}
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
              workOrderTemplates={db.workOrderTemplates}
              tasks={db.tasks}
              tone={tone}
              locked={confirmed}
              showNow={date === todayKey()}
              onSelectAssignment={(assignment) => {
                setError("");
                setNotice("");
                setSheet({ mode: "edit", assignment });
              }}
              onSelectHour={(hour) => {
                setError("");
                setNotice("");
                setSheet({ mode: "create", startHour: hour, durationHours: 1 });
              }}
            />
          </>
        )}
      </div>

      {!sheet ? (
        <div className="fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto max-w-md rounded-t-xl border-x border-t border-slate-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {restDay ? (
              <p className="py-1 text-center text-sm text-slate-500">{REST_DAY_MESSAGE}</p>
            ) : canEdit ? (
              <div className="space-y-2">
                <p className={`text-center text-sm font-medium ${hoursTone}`}>Radio si {workedHours} h</p>
                <button type="button" className="btn-success w-full" onClick={confirmHours}>
                  Potvrdi sate
                </button>
              </div>
            ) : confirmed ? (
              <div className="space-y-2">
                <p className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-700">
                  <CheckIcon className="h-4 w-4" />
                  {hourStatus === "uredeni_i_potvrdeni" ? "Sati su uređeni i potvrđeni" : "Sati su potvrđeni"}
                </p>
                <p className={`text-center text-sm font-medium ${hoursTone}`}>Radio si {workedHours} h</p>
                {editable ? (
                  <button type="button" className="btn-danger w-full" onClick={unconfirmHours}>
                    Poništi potvrdu
                  </button>
                ) : null}
              </div>
            ) : tone === "future" ? (
              <p className="py-1 text-center text-sm text-slate-500">Samo pregled · planirano {workedHours} h</p>
            ) : (
              <p className="py-1 text-center text-sm text-slate-500">Sati nisu potvrđeni · {workedHours} h</p>
            )}
          </div>
        </div>
      ) : null}

      {sheet && canEdit ? (
        <EmployeeAssignmentSheet
          title={sheet.mode === "create" ? "Novi zadatak" : "Uredi zadatak"}
          startHour={sheet.mode === "create" ? sheet.startHour : sheet.assignment.startHour}
          durationHours={sheet.mode === "create" ? sheet.durationHours : sheet.assignment.durationHours}
          workOrders={db.workOrders}
          tasks={db.tasks}
          roleIds={employee.roleIds}
          dayWorkOrderIds={dayWorkOrderIds}
          otherHours={sheetOtherHours}
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

      {resetOpen ? (
        <ConfirmDialog
          title="Poništi testne podatke"
          message="Ovo vraća demo stanje na ovom uređaju. Lokalne izmjene sati i potvrde nestaju."
          confirmLabel="Poništi testne podatke"
          onConfirm={resetTestData}
          onClose={() => setResetOpen(false)}
        />
      ) : null}
    </div>
  );
}
