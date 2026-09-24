import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { formatHour, ROLE_LABELS } from "../../lib/dates";
import {
  CORE_END,
  CORE_START,
  DAY_START,
  EXPECTED_HOURS,
  edgeHourFromClientX,
  expandSelection,
  hourColumns,
  hourFromClientX,
  newId,
  occupiedHours,
  resizeBlock,
  shiftChain,
  totalHours,
  workGaps,
} from "../../lib/gantt";
import { CheckIcon, CopyIcon, UserEditIcon, WarningIcon } from "../icons";
import { AssignmentModal } from "./AssignmentModal";
import { CopyScheduleModal } from "./CopyScheduleModal";
import type { Assignment, Employee, Task, WorkOrder } from "../../types";

const HOUR_WIDTH = 56;
const EMP_WIDTH = 300;
const ROW_HEIGHT = 76;
const SPLIT_LANE = 38;
const HOURS = hourColumns();
const TIMELINE_WIDTH = HOURS.length * HOUR_WIDTH;

type Draft = {
  employeeId: string;
  assignments: Assignment[];
};

type Selection = {
  employeeId: string;
  startHour: number;
  currentHour: number;
};

type CreateState = {
  employeeId: string;
  startHour: number;
  endHour: number;
};

type EditState = {
  employeeId: string;
  assignmentId: string;
};

type Props = {
  date: string;
  employees: Employee[];
  tasks: Task[];
  workOrders: WorkOrder[];
  assignments: Assignment[];
  copySources: Employee[];
  confirmedEmployeeIds?: string[];
  onCommitEmployeeDay: (employeeId: string, next: Assignment[]) => void;
};

export function GanttBoard({
  date,
  employees,
  tasks,
  workOrders,
  assignments,
  copySources,
  confirmedEmployeeIds = [],
  onCommitEmployeeDay,
}: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [create, setCreate] = useState<CreateState | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [copyFor, setCopyFor] = useState<string | null>(null);
  const originRef = useRef<Assignment[]>([]);
  const dragRef = useRef<{
    kind: "move" | "resize";
    employeeId: string;
    assignmentId: string;
    edge?: "start" | "end";
    startX: number;
    moved: boolean;
    lastValid: Assignment[];
  } | null>(null);

  const byEmployee = useMemo(() => {
    const map: Record<string, Assignment[]> = {};
    for (const employee of employees) map[employee.id] = [];
    for (const assignment of assignments) {
      if (assignment.date !== date) continue;
      if (!map[assignment.employeeId]) map[assignment.employeeId] = [];
      map[assignment.employeeId].push(assignment);
    }
    return map;
  }, [assignments, date, employees]);

  function allFor(employeeId: string): Assignment[] {
    return byEmployee[employeeId] ?? [];
  }

  function plannedFor(employeeId: string): Assignment[] {
    if (draft?.employeeId === employeeId) return draft.assignments;
    return allFor(employeeId).filter((row) => row.kind !== "actual");
  }

  function actualFor(employeeId: string): Assignment[] {
    return allFor(employeeId).filter((row) => row.kind === "actual");
  }

  function taskById(id: string) {
    return tasks.find((task) => task.id === id);
  }

  function orderById(id: string) {
    return workOrders.find((order) => order.id === id);
  }

  function beginSelect(employeeId: string, event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const timeline = event.currentTarget;
    const hour = hourFromClientX(event.clientX, timeline);
    if (occupiedHours(plannedFor(employeeId)).has(hour)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelection({ employeeId, startHour: hour, currentHour: hour });
  }

  function moveSelect(event: ReactPointerEvent<HTMLDivElement>) {
    if (!selection) return;
    const hour = hourFromClientX(event.clientX, event.currentTarget);
    setSelection({ ...selection, currentHour: hour });
  }

  function endSelect(event: ReactPointerEvent<HTMLDivElement>) {
    if (!selection) return;
    const occupied = occupiedHours(plannedFor(selection.employeeId));
    const range = expandSelection(selection.startHour, selection.currentHour, occupied);
    setSelection(null);
    if (!range || range.end - range.start < 1) return;
    setCreate({ employeeId: selection.employeeId, startHour: range.start, endHour: range.end });
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function beginMove(employeeId: string, assignmentId: string, event: ReactPointerEvent) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const current = plannedFor(employeeId);
    originRef.current = current.map((row) => ({ ...row }));
    dragRef.current = {
      kind: "move",
      employeeId,
      assignmentId,
      startX: event.clientX,
      moved: false,
      lastValid: current.map((row) => ({ ...row })),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft({ employeeId, assignments: current });
  }

  function beginResize(
    employeeId: string,
    assignmentId: string,
    edge: "start" | "end",
    event: ReactPointerEvent,
  ) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const current = plannedFor(employeeId);
    originRef.current = current.map((row) => ({ ...row }));
    dragRef.current = {
      kind: "resize",
      employeeId,
      assignmentId,
      edge,
      startX: event.clientX,
      moved: false,
      lastValid: current.map((row) => ({ ...row })),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft({ employeeId, assignments: current });
  }

  function onWindowPointerMove(event: PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    if (Math.abs(event.clientX - drag.startX) > 6) drag.moved = true;
    const timeline = document.querySelector<HTMLElement>(`[data-timeline="${drag.employeeId}"]`);
    if (!timeline) return;
    const hourWidth = timeline.getBoundingClientRect().width / HOURS.length;

    if (drag.kind === "move") {
      const delta = Math.round((event.clientX - drag.startX) / hourWidth);
      const next = shiftChain(originRef.current, drag.assignmentId, delta);
      if (next) {
        drag.lastValid = next;
        setDraft({ employeeId: drag.employeeId, assignments: next });
      }
      return;
    }

    const edgeHour = edgeHourFromClientX(event.clientX, timeline);
    const next = resizeBlock(originRef.current, drag.assignmentId, drag.edge ?? "end", edgeHour);
    if (next) {
      drag.lastValid = next;
      setDraft({ employeeId: drag.employeeId, assignments: next });
    }
  }

  function onWindowPointerUp() {
    const drag = dragRef.current;
    if (!drag) return;
    const wasClick = drag.kind === "move" && !drag.moved;
    const employeeId = drag.employeeId;
    const assignmentId = drag.assignmentId;
    onCommitEmployeeDay(employeeId, drag.lastValid);
    dragRef.current = null;
    setDraft(null);
    if (wasClick) setEdit({ employeeId, assignmentId });
  }

  useEffect(() => {
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
    return () => {
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", onWindowPointerUp);
    };
  });

  function saveCreate(workOrderId: string, taskId: string) {
    if (!create) return;
    const current = plannedFor(create.employeeId);
    const next: Assignment[] = [
      ...current,
      {
        id: newId("asg"),
        employeeId: create.employeeId,
        date,
        workOrderId,
        taskId,
        startHour: create.startHour,
        durationHours: create.endHour - create.startHour,
        kind: "planned",
      },
    ];
    onCommitEmployeeDay(create.employeeId, next);
    setCreate(null);
  }

  function saveEdit(workOrderId: string, taskId: string) {
    if (!edit) return;
    const current = plannedFor(edit.employeeId);
    const next = current.map((row) =>
      row.id === edit.assignmentId ? { ...row, workOrderId, taskId } : row,
    );
    onCommitEmployeeDay(edit.employeeId, next);
    setEdit(null);
  }

  function deleteEdit() {
    if (!edit) return;
    const next = plannedFor(edit.employeeId).filter((row) => row.id !== edit.assignmentId);
    onCommitEmployeeDay(edit.employeeId, next);
    setEdit(null);
  }

  function copyFrom(targetId: string, sourceId: string) {
    const source = plannedFor(sourceId)
      .filter((row) => {
        const order = orderById(row.workOrderId);
        return order && !order.archived;
      })
      .map((row) => ({
        ...row,
        id: newId("asg"),
        employeeId: targetId,
      }));
    onCommitEmployeeDay(targetId, source);
    setCopyFor(null);
  }

  function renderBlock(employeeId: string, assignment: Assignment, interactive: boolean, muted: boolean, compact: boolean) {
    const order = orderById(assignment.workOrderId);
    const task = taskById(assignment.taskId);
    return (
      <div
        key={assignment.id}
        className={`absolute z-10 flex overflow-hidden rounded-md text-white shadow-sm ${
          compact ? "top-px bottom-px" : "top-1 bottom-1"
        } ${interactive ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"} ${
          muted ? "opacity-50 grayscale-[0.4]" : ""
        }`}
        style={{
          left: (assignment.startHour - DAY_START) * HOUR_WIDTH + 2,
          width: assignment.durationHours * HOUR_WIDTH - 4,
          backgroundColor: order?.color ?? "#334155",
        }}
        title={`${muted ? "Plan" : interactive ? "Plan" : "Ostvareno"}: ${order?.code ?? "?"} ${order?.name ?? ""} · ${task?.code ?? "?"} ${task?.name ?? ""}`}
        onPointerDown={interactive ? (event) => beginMove(employeeId, assignment.id, event) : undefined}
      >
        {interactive ? (
          <button
            type="button"
            aria-label="Promijeni početak"
            className="absolute left-0 top-0 z-10 h-full w-2 cursor-ew-resize bg-black/10"
            onPointerDown={(event) => beginResize(employeeId, assignment.id, "start", event)}
          />
        ) : null}
        <div className={`flex min-w-0 flex-1 justify-center text-left ${compact ? "flex-row items-center px-2" : "flex-col px-3"}`}>
          <div className={`truncate font-semibold ${compact ? "text-[10px] leading-none" : "text-xs"}`}>
            {order?.code ?? "?"} · {order?.name ?? ""}
          </div>
          {compact ? (
            <div className="ml-1 truncate text-[10px] leading-none text-white/80">{task?.code}</div>
          ) : (
            <div className="truncate text-[11px] text-white/85">{task?.code} {task?.name}</div>
          )}
        </div>
        {interactive ? (
          <button
            type="button"
            aria-label="Promijeni završetak"
            className="absolute right-0 top-0 z-10 h-full w-2 cursor-ew-resize bg-black/10"
            onPointerDown={(event) => beginResize(employeeId, assignment.id, "end", event)}
          />
        ) : null}
      </div>
    );
  }

  const createEmployee = employees.find((row) => row.id === create?.employeeId);
  const editAssignment = edit
    ? plannedFor(edit.employeeId).find((row) => row.id === edit.assignmentId)
    : undefined;
  const editEmployee = employees.find((row) => row.id === edit?.employeeId) ?? copySources.find((row) => row.id === edit?.employeeId);

  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
      <div style={{ minWidth: EMP_WIDTH + TIMELINE_WIDTH }}>
        <div className="flex border-b border-slate-200 bg-slate-50">
          <div
            className="sticky left-0 z-20 flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-4 text-xs font-semibold uppercase tracking-wide text-slate-500"
            style={{ width: EMP_WIDTH }}
          >
            Zaposlenik
          </div>
          <div className="relative flex" style={{ width: TIMELINE_WIDTH }}>
            <div
              className="pointer-events-none absolute inset-y-0 bg-blue-50/70"
              style={{
                left: (CORE_START - DAY_START) * HOUR_WIDTH,
                width: (CORE_END - CORE_START) * HOUR_WIDTH,
              }}
            />
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative z-10 border-r border-slate-200 py-2 text-center text-xs font-medium text-slate-500 last:border-r-0"
                style={{ width: HOUR_WIDTH }}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>
        </div>

        {employees.map((employee) => {
          const planned = plannedFor(employee.id);
          const actuals = actualFor(employee.id);
          const split = actuals.length > 0;
          const displayBlocks = split ? actuals : planned;
          const displayHours = totalHours(displayBlocks);
          const planHours = totalHours(planned);
          const gaps = workGaps(displayBlocks);
          const plannedGaps = workGaps(planned);
          const actualGaps = workGaps(actuals);
          const hoursOff = displayHours !== EXPECTED_HOURS;
          const selectedRange =
            selection?.employeeId === employee.id
              ? expandSelection(selection.startHour, selection.currentHour, occupiedHours(planned))
              : null;
          const hourTone =
            gaps.length > 0
              ? "bg-amber-50"
              : displayHours === EXPECTED_HOURS
                ? "bg-emerald-50"
                : displayHours > EXPECTED_HOURS
                  ? "bg-red-50"
                  : "bg-white";
          const warningTone = displayHours > EXPECTED_HOURS ? "text-red-500" : "text-amber-500";

          return (
            <div key={employee.id} className="flex border-b border-slate-100 last:border-b-0 bg-white">
              <div
                className={`sticky left-0 z-20 flex shrink-0 items-center border-r border-slate-200 px-3 ${hourTone}`}
                style={{ width: EMP_WIDTH, minHeight: ROW_HEIGHT }}
              >
                <div className="flex items-start gap-2">
                  {hoursOff || gaps.length > 0 ? (
                    <span className="mt-0.5 flex shrink-0 flex-col gap-1">
                      {hoursOff ? (
                        <span className="group relative">
                          <span className={warningTone}>
                            <WarningIcon className="h-4 w-4" />
                          </span>
                          <span className="pointer-events-none absolute left-full top-1/2 z-40 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white group-hover:block">
                            {displayHours > EXPECTED_HOURS
                              ? `Previše sati: ${displayHours} h (očekivano ${EXPECTED_HOURS} h)`
                              : `Premalo sati: ${displayHours} h (očekivano ${EXPECTED_HOURS} h)`}
                          </span>
                        </span>
                      ) : null}
                      {gaps.length > 0 ? (
                        <span className="group relative">
                          <span className="text-amber-500">
                            <WarningIcon className="h-4 w-4" />
                          </span>
                          <span className="pointer-events-none absolute left-full top-1/2 z-40 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white group-hover:block">
                            {gaps.length === 1
                              ? `Rupa u radu: ${formatHour(gaps[0].start)} - ${formatHour(gaps[0].end)}`
                              : `Rupe u radu: ${gaps.map((gap) => `${formatHour(gap.start)} - ${formatHour(gap.end)}`).join(", ")}`}
                          </span>
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="group relative mt-0.5 shrink-0 text-emerald-600">
                      <CheckIcon className="h-4 w-4" />
                      <span className="pointer-events-none absolute left-full top-1/2 z-40 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white group-hover:block">
                        Plan je u redu
                      </span>
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-900">{employee.name}</div>
                    <div className="text-xs text-slate-500">{ROLE_LABELS[employee.role]}</div>
                    <div className="text-xs text-slate-500">
                      {split && planHours !== displayHours ? `${planHours} → ${displayHours} h` : `${displayHours} h`}
                      {confirmedEmployeeIds.includes(employee.id) ? (
                        <span className="ml-1 font-semibold text-emerald-700">Potvrđeno</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <div className="relative">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Kopiraj raspored"
                        onClick={() => setCopyFor(employee.id)}
                      >
                        <CopyIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="group relative">
                      <button
                        type="button"
                        className="icon-btn cursor-not-allowed text-slate-300 hover:bg-transparent hover:text-slate-300"
                        aria-label="Uredi informacije o zaposleniku"
                      >
                        <UserEditIcon className="h-4 w-4" />
                      </button>
                      <span className="pointer-events-none absolute bottom-full right-0 z-30 mb-1 hidden whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-white group-hover:block">
                        Uredi informacije o zaposleniku
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col" style={{ width: TIMELINE_WIDTH, height: ROW_HEIGHT }}>
                <div
                  data-timeline={employee.id}
                  className="relative cursor-crosshair select-none"
                  style={{ height: split ? SPLIT_LANE : ROW_HEIGHT }}
                  onPointerDown={(event) => beginSelect(employee.id, event)}
                  onPointerMove={moveSelect}
                  onPointerUp={endSelect}
                >
                  {split ? (
                    <span className="pointer-events-none absolute left-0.5 top-0.5 z-20 rounded bg-white/80 px-0.5 text-[8px] font-bold uppercase leading-none text-slate-400">
                      Plan
                    </span>
                  ) : null}
                  <div
                    className="pointer-events-none absolute inset-y-0 bg-blue-50/40"
                    style={{
                      left: (CORE_START - DAY_START) * HOUR_WIDTH,
                      width: (CORE_END - CORE_START) * HOUR_WIDTH,
                    }}
                  />
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute inset-y-0 border-r border-slate-100 last:border-r-0"
                      style={{ left: (hour - DAY_START) * HOUR_WIDTH, width: HOUR_WIDTH }}
                    />
                  ))}
                  {selectedRange ? (
                    <div
                      className="pointer-events-none absolute top-1 bottom-1 z-10 rounded-md bg-blue-600/20 ring-1 ring-blue-500"
                      style={{
                        left: (selectedRange.start - DAY_START) * HOUR_WIDTH + 2,
                        width: (selectedRange.end - selectedRange.start) * HOUR_WIDTH - 4,
                      }}
                    />
                  ) : null}
                  {plannedGaps.map((gap) => (
                    <div
                      key={`pg-${gap.start}-${gap.end}`}
                      className="pointer-events-none absolute top-1 bottom-1 z-[5] rounded-md bg-amber-200/40 ring-1 ring-dashed ring-amber-400"
                      style={{
                        left: (gap.start - DAY_START) * HOUR_WIDTH + 2,
                        width: (gap.end - gap.start) * HOUR_WIDTH - 4,
                      }}
                    />
                  ))}
                  {planned.map((assignment) => renderBlock(employee.id, assignment, true, split, split))}
                </div>
                {split ? (
                  <div className="relative border-t border-slate-200 bg-slate-50/70" style={{ height: SPLIT_LANE }}>
                    <span className="pointer-events-none absolute left-0.5 top-0.5 z-20 rounded bg-white/90 px-0.5 text-[8px] font-bold uppercase leading-none text-slate-700">
                      Ostv.
                    </span>
                    <div
                      className="pointer-events-none absolute inset-y-0 bg-blue-50/30"
                      style={{
                        left: (CORE_START - DAY_START) * HOUR_WIDTH,
                        width: (CORE_END - CORE_START) * HOUR_WIDTH,
                      }}
                    />
                    {HOURS.map((hour) => (
                      <div
                        key={`a-${hour}`}
                        className="absolute inset-y-0 border-r border-slate-100 last:border-r-0"
                        style={{ left: (hour - DAY_START) * HOUR_WIDTH, width: HOUR_WIDTH }}
                      />
                    ))}
                    {actualGaps.map((gap) => (
                      <div
                        key={`ag-${gap.start}-${gap.end}`}
                        className="pointer-events-none absolute top-1 bottom-1 z-[5] rounded-md bg-amber-200/40 ring-1 ring-dashed ring-amber-400"
                        style={{
                          left: (gap.start - DAY_START) * HOUR_WIDTH + 2,
                          width: (gap.end - gap.start) * HOUR_WIDTH - 4,
                        }}
                      />
                    ))}
                    {actuals.map((assignment) => renderBlock(employee.id, assignment, false, false, true))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {create ? (
        <AssignmentModal
          title="Novi unos u plan"
          startHour={create.startHour}
          endHour={create.endHour}
          workOrders={workOrders}
          tasks={tasks}
          role={createEmployee?.role}
          onClose={() => setCreate(null)}
          onSave={saveCreate}
        />
      ) : null}

      {edit && editAssignment ? (
        <AssignmentModal
          title="Uredi unos u plan"
          startHour={editAssignment.startHour}
          endHour={editAssignment.startHour + editAssignment.durationHours}
          workOrders={workOrders}
          tasks={tasks}
          role={editEmployee?.role}
          initialWorkOrderId={editAssignment.workOrderId}
          initialTaskId={editAssignment.taskId}
          onClose={() => setEdit(null)}
          onSave={saveEdit}
          onDelete={deleteEdit}
        />
      ) : null}

      {copyFor ? (
        <CopyScheduleModal
          targetName={employees.find((row) => row.id === copyFor)?.name ?? copySources.find((row) => row.id === copyFor)?.name ?? ""}
          employees={copySources.filter((row) => row.id !== copyFor)}
          onClose={() => setCopyFor(null)}
          onCopy={(sourceId) => copyFrom(copyFor, sourceId)}
        />
      ) : null}
    </div>
  );
}
