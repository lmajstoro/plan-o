import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { formatHour } from "../../lib/dates";
import { assignedRoles } from "../../lib/roles";
import {
  CORE_END,
  CORE_START,
  DAY_START,
  EXPECTED_HOURS,
  blockEnd,
  edgeHourFromClientX,
  expandSelection,
  hourColumns,
  hourFromClientX,
  newId,
  occupiedHours,
  resizeBlock,
  sameWorkBlocks,
  shiftChain,
  totalHours,
  workGaps,
} from "../../lib/gantt";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, EditIcon, TrashIcon, WarningIcon } from "../icons";
import { AssignmentModal } from "./AssignmentModal";
import { taskLabel, workOrderCode, workOrderColor } from "../../lib/workOrders";
import type { Assignment, Employee, JobRole, Task, WorkOrder, WorkOrderTemplate } from "../../types";

const HOUR_WIDTH = 60;
const EMP_WIDTH = 200;
const ROW_HEIGHT = 84;
const SPLIT_LANE = 42;
const HOURS = hourColumns();
const TIMELINE_WIDTH = HOURS.length * HOUR_WIDTH;
const LONG_PRESS_MS = 450;
const TAP_SLOP = 10;

type Draft = { employeeId: string; assignments: Assignment[] };
type Picked = { employeeId: string; assignmentId: string };
type Range = { employeeId: string; startHour: number; currentHour: number };
type HourRange = { employeeId: string; startHour: number; endHour: number };

type Gesture =
  | { kind: "pending-empty"; pointerId: number; employeeId: string; hour: number; free: boolean; x: number; y: number; timer: number }
  | { kind: "pending-block"; pointerId: number; employeeId: string; assignmentId: string; x: number; y: number }
  | { kind: "range"; pointerId: number; employeeId: string; startHour: number }
  | {
      kind: "move" | "resize";
      pointerId: number;
      employeeId: string;
      assignmentId: string;
      edge?: "start" | "end";
      startX: number;
      moved: boolean;
      origin: Assignment[];
      lastValid: Assignment[];
    };

type Props = {
  date: string;
  employees: Employee[];
  tasks: Task[];
  workOrders: WorkOrder[];
  workOrderTemplates: WorkOrderTemplate[];
  jobRoles: JobRole[];
  assignments: Assignment[];
  confirmedEmployeeIds?: string[];
  showPlanned?: boolean;
  onCommitEmployeeDay: (employeeId: string, next: Assignment[]) => void;
};

/**
 * Gantt for touch screens. A plain swipe always scrolls; editing needs an explicit tap to pick a block
 * (then drag it or its handles) or a long press on an empty slot to select a range.
 */
export function TouchGanttBoard({
  date,
  employees,
  tasks,
  workOrders,
  workOrderTemplates,
  jobRoles,
  assignments,
  confirmedEmployeeIds = [],
  showPlanned = true,
  onCommitEmployeeDay,
}: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [range, setRange] = useState<Range | null>(null);
  const [create, setCreate] = useState<HourRange | null>(null);
  const [edit, setEdit] = useState<Picked | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
  const dayHasActuals = assignments.some((row) => row.date === date && row.kind === "actual");

  useEffect(() => {
    setPicked(null);
    setRange(null);
  }, [date, showPlanned]);

  function plannedFor(employeeId: string): Assignment[] {
    if (draft?.employeeId === employeeId) return draft.assignments;
    return (byEmployee[employeeId] ?? []).filter((row) => row.kind !== "actual");
  }

  function actualFor(employeeId: string): Assignment[] {
    return (byEmployee[employeeId] ?? []).filter((row) => row.kind === "actual");
  }

  function timelineFor(employeeId: string) {
    return scrollRef.current?.querySelector<HTMLElement>(`[data-touch-timeline="${employeeId}"]`) ?? null;
  }

  function startRange() {
    const gesture = gestureRef.current;
    if (gesture?.kind !== "pending-empty" || !gesture.free) return;
    gestureRef.current = { kind: "range", pointerId: gesture.pointerId, employeeId: gesture.employeeId, startHour: gesture.hour };
    setPicked(null);
    setRange({ employeeId: gesture.employeeId, startHour: gesture.hour, currentHour: gesture.hour });
    navigator.vibrate?.(15);
  }

  function onLaneDown(employeeId: string, event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (gestureRef.current) return;
    const hour = hourFromClientX(event.clientX, event.currentTarget);
    const free = !occupiedHours(plannedFor(employeeId)).has(hour);
    const timer = free ? window.setTimeout(startRange, LONG_PRESS_MS) : 0;
    gestureRef.current = {
      kind: "pending-empty",
      pointerId: event.pointerId,
      employeeId,
      hour,
      free,
      x: event.clientX,
      y: event.clientY,
      timer,
    };
  }

  function onBlockDown(employeeId: string, assignmentId: string, event: ReactPointerEvent) {
    event.stopPropagation();
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (gestureRef.current) return;
    const isPicked = picked?.employeeId === employeeId && picked.assignmentId === assignmentId;
    if (!isPicked) {
      gestureRef.current = {
        kind: "pending-block",
        pointerId: event.pointerId,
        employeeId,
        assignmentId,
        x: event.clientX,
        y: event.clientY,
      };
      return;
    }
    event.preventDefault();
    beginEdit("move", employeeId, assignmentId, event);
  }

  function onHandleDown(employeeId: string, assignmentId: string, edge: "start" | "end", event: ReactPointerEvent) {
    event.stopPropagation();
    event.preventDefault();
    if (gestureRef.current) return;
    beginEdit("resize", employeeId, assignmentId, event, edge);
  }

  function beginEdit(
    kind: "move" | "resize",
    employeeId: string,
    assignmentId: string,
    event: ReactPointerEvent,
    edge?: "start" | "end",
  ) {
    const current = plannedFor(employeeId).map((row) => ({ ...row }));
    gestureRef.current = {
      kind,
      pointerId: event.pointerId,
      employeeId,
      assignmentId,
      edge,
      startX: event.clientX,
      moved: false,
      origin: current,
      lastValid: current,
    };
    setDraft({ employeeId, assignments: current });
  }

  function onWindowMove(event: PointerEvent) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    if (gesture.kind === "pending-empty" || gesture.kind === "pending-block") {
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > TAP_SLOP) {
        if (gesture.kind === "pending-empty") window.clearTimeout(gesture.timer);
        gestureRef.current = null;
      }
      return;
    }

    const timeline = timelineFor(gesture.employeeId);
    if (!timeline) return;

    if (gesture.kind === "range") {
      const hour = hourFromClientX(event.clientX, timeline);
      setRange((prev) => (prev ? { ...prev, currentHour: hour } : prev));
      return;
    }

    if (Math.abs(event.clientX - gesture.startX) > TAP_SLOP) gesture.moved = true;
    if (!gesture.moved) return;

    const next =
      gesture.kind === "move"
        ? shiftChain(
            gesture.origin,
            gesture.assignmentId,
            Math.round((event.clientX - gesture.startX) / (timeline.getBoundingClientRect().width / HOURS.length)),
          )
        : resizeBlock(gesture.origin, gesture.assignmentId, gesture.edge ?? "end", edgeHourFromClientX(event.clientX, timeline));
    if (next && next.some((row) => row.id === gesture.assignmentId)) {
      gesture.lastValid = next;
      setDraft({ employeeId: gesture.employeeId, assignments: next });
    }
  }

  function onWindowUp(event: PointerEvent) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;

    if (gesture.kind === "pending-empty") {
      window.clearTimeout(gesture.timer);
      if (picked) {
        setPicked(null);
        return;
      }
      if (gesture.free) {
        setCreate({ employeeId: gesture.employeeId, startHour: gesture.hour, endHour: gesture.hour + 1 });
      }
      return;
    }

    if (gesture.kind === "pending-block") {
      setPicked({ employeeId: gesture.employeeId, assignmentId: gesture.assignmentId });
      return;
    }

    if (gesture.kind === "range") {
      const selected = range
        ? expandSelection(range.startHour, range.currentHour, occupiedHours(plannedFor(gesture.employeeId)))
        : null;
      setRange(null);
      if (selected && selected.end > selected.start) {
        setCreate({ employeeId: gesture.employeeId, startHour: selected.start, endHour: selected.end });
      }
      return;
    }

    setDraft(null);
    if (gesture.moved) {
      onCommitEmployeeDay(gesture.employeeId, gesture.lastValid);
    } else if (gesture.kind === "move") {
      setEdit({ employeeId: gesture.employeeId, assignmentId: gesture.assignmentId });
    }
  }

  function onWindowCancel(event: PointerEvent) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    if (gesture.kind === "pending-empty") window.clearTimeout(gesture.timer);
    if (gesture.kind === "range") setRange(null);
    if (gesture.kind === "move" || gesture.kind === "resize") setDraft(null);
  }

  useEffect(() => {
    window.addEventListener("pointermove", onWindowMove);
    window.addEventListener("pointerup", onWindowUp);
    window.addEventListener("pointercancel", onWindowCancel);
    return () => {
      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("pointerup", onWindowUp);
      window.removeEventListener("pointercancel", onWindowCancel);
    };
  });

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const blockScroll = (event: TouchEvent) => {
      const kind = gestureRef.current?.kind;
      if (kind === "range" || kind === "move" || kind === "resize") event.preventDefault();
    };
    node.addEventListener("touchmove", blockScroll, { passive: false });
    return () => node.removeEventListener("touchmove", blockScroll);
  }, []);

  function commitPicked(next: Assignment[] | null) {
    if (!picked || !next) return;
    onCommitEmployeeDay(picked.employeeId, next);
  }

  const pickedEmployee = picked ? employees.find((row) => row.id === picked.employeeId) : undefined;
  const pickedRows = picked ? plannedFor(picked.employeeId) : [];
  const pickedBlock = pickedEmployee ? pickedRows.find((row) => row.id === picked?.assignmentId) : undefined;
  const pickedOrder = pickedBlock ? workOrders.find((row) => row.id === pickedBlock.workOrderId) : undefined;
  const pickedTask = pickedBlock ? tasks.find((row) => row.id === pickedBlock.taskId) : undefined;

  function shiftPicked(delta: number) {
    return pickedBlock ? shiftChain(pickedRows, pickedBlock.id, delta) : null;
  }

  function resizePicked(delta: number) {
    if (!pickedBlock) return null;
    const next = resizeBlock(pickedRows, pickedBlock.id, "end", blockEnd(pickedBlock) + delta);
    return next && next.some((row) => row.id === pickedBlock.id) ? next : null;
  }

  function saveCreate(workOrderId: string, taskId: string) {
    if (!create) return;
    const assignment: Assignment = {
      id: newId("asg"),
      employeeId: create.employeeId,
      date,
      workOrderId,
      taskId,
      startHour: create.startHour,
      durationHours: create.endHour - create.startHour,
      kind: "planned",
    };
    onCommitEmployeeDay(create.employeeId, [...plannedFor(create.employeeId), assignment]);
    setCreate(null);
    setPicked({ employeeId: create.employeeId, assignmentId: assignment.id });
  }

  function saveEdit(workOrderId: string, taskId: string) {
    if (!edit) return;
    const next = plannedFor(edit.employeeId).map((row) =>
      row.id === edit.assignmentId ? { ...row, workOrderId, taskId } : row,
    );
    onCommitEmployeeDay(edit.employeeId, next);
    setEdit(null);
  }

  function deleteAssignment(target: Picked) {
    const next = plannedFor(target.employeeId).filter((row) => row.id !== target.assignmentId);
    onCommitEmployeeDay(target.employeeId, next);
    setEdit(null);
    setPicked(null);
  }

  function renderBlock(employeeId: string, assignment: Assignment, interactive: boolean, muted: boolean, compact: boolean) {
    const order = workOrders.find((row) => row.id === assignment.workOrderId);
    const task = tasks.find((row) => row.id === assignment.taskId);
    const isPicked = interactive && picked?.employeeId === employeeId && picked.assignmentId === assignment.id;
    return (
      <div
        key={assignment.id}
        className={`absolute ${compact ? "top-px bottom-px" : "top-1.5 bottom-1.5"} ${
          isPicked ? "z-[15]" : "z-10"
        } ${interactive ? "" : "pointer-events-none"} ${muted && !isPicked ? "opacity-50 grayscale-[0.4]" : ""}`}
        style={{
          left: (assignment.startHour - DAY_START) * HOUR_WIDTH + 2,
          width: assignment.durationHours * HOUR_WIDTH - 4,
          touchAction: isPicked ? "none" : undefined,
        }}
        onPointerDown={interactive ? (event) => onBlockDown(employeeId, assignment.id, event) : undefined}
      >
        <div
          className={`flex h-full overflow-hidden rounded-lg text-white shadow-sm ${
            isPicked ? "shadow-lg ring-[3px] ring-slate-900 ring-offset-2 ring-offset-white" : ""
          }`}
          style={{ backgroundColor: workOrderColor(order, workOrderTemplates) }}
        >
          <div className={`flex min-w-0 flex-1 text-left ${compact ? "flex-row items-center gap-1 px-2" : "flex-col justify-center gap-0.5 px-3"}`}>
            <div className="flex min-w-0 items-center gap-1.5">
              <div className={`min-w-0 truncate font-semibold ${compact ? "text-[11px] leading-none" : "text-sm"}`}>
                {order ? workOrderCode(order) : "?"} · {order?.name ?? ""}
              </div>
              <span
                className={`shrink-0 rounded bg-black/25 font-bold tabular-nums leading-none ${
                  compact ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5 text-xs"
                }`}
              >
                {assignment.durationHours} h
              </span>
            </div>
            {compact ? (
              <div className="min-w-0 truncate text-[11px] leading-none text-white/80">{task?.code}</div>
            ) : (
              <div className="truncate text-xs text-white/85">{taskLabel(task)}</div>
            )}
          </div>
        </div>
        {isPicked ? (
          <>
            <ResizeHandle side="start" onPointerDown={(event) => onHandleDown(employeeId, assignment.id, "start", event)} />
            <ResizeHandle side="end" onPointerDown={(event) => onHandleDown(employeeId, assignment.id, "end", event)} />
          </>
        ) : null}
      </div>
    );
  }

  const createEmployee = employees.find((row) => row.id === create?.employeeId);
  const editAssignment = edit ? plannedFor(edit.employeeId).find((row) => row.id === edit.assignmentId) : undefined;
  const editEmployee = employees.find((row) => row.id === edit?.employeeId);
  const canLeft = Boolean(shiftPicked(-1));
  const canRight = Boolean(shiftPicked(1));
  const canShrink = Boolean(resizePicked(-1));
  const canGrow = Boolean(resizePicked(1));

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div
        ref={scrollRef}
        className="h-full overflow-auto overscroll-contain select-none [-webkit-touch-callout:none]"
        onContextMenu={(event) => event.preventDefault()}
      >
        <div style={{ minWidth: EMP_WIDTH + TIMELINE_WIDTH }} className={pickedBlock ? "pb-28" : ""}>
          <div className="sticky top-0 z-30 flex border-b border-slate-200 bg-slate-50">
            <div
              className="sticky left-0 z-40 flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
              style={{ width: EMP_WIDTH }}
            >
              Zaposlenik
            </div>
            <div className="relative flex" style={{ width: TIMELINE_WIDTH }}>
              <div
                className="pointer-events-none absolute inset-y-0 bg-blue-50/70"
                style={{ left: (CORE_START - DAY_START) * HOUR_WIDTH, width: (CORE_END - CORE_START) * HOUR_WIDTH }}
              />
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="relative z-10 border-r border-slate-200 py-2.5 text-center text-xs font-semibold text-slate-500 last:border-r-0"
                  style={{ width: HOUR_WIDTH }}
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="px-4 py-10 text-slate-500">Nema zaposlenika za odabrane filtere.</div>
          ) : null}

          {employees.map((employee) => {
            const planned = plannedFor(employee.id);
            const actuals = actualFor(employee.id);
            const actualsOnly = !showPlanned;
            const asPlanned = actuals.length > 0 && sameWorkBlocks(planned, actuals);
            const notEntered = dayHasActuals && actuals.length === 0;
            const split = !actualsOnly && actuals.length > 0 && !asPlanned;
            const displayBlocks = actualsOnly || split ? actuals : planned;
            const displayHours = totalHours(displayBlocks);
            const planHours = totalHours(planned);
            const gaps = workGaps(displayBlocks);
            const hoursOff = displayHours !== EXPECTED_HOURS;
            const confirmed = confirmedEmployeeIds.includes(employee.id);
            const selectedRange =
              range?.employeeId === employee.id
                ? expandSelection(range.startHour, range.currentHour, occupiedHours(planned))
                : null;
            const tone =
              gaps.length > 0
                ? "bg-amber-50"
                : displayHours === EXPECTED_HOURS
                  ? "bg-emerald-50"
                  : displayHours > EXPECTED_HOURS
                    ? "bg-red-50"
                    : "bg-white";

            return (
              <div key={employee.id} className="flex border-b border-slate-100 bg-white last:border-b-0">
                <div
                  className={`sticky left-0 z-20 flex shrink-0 flex-col justify-center gap-0.5 border-r border-slate-200 px-3 ${tone}`}
                  style={{ width: EMP_WIDTH, minHeight: ROW_HEIGHT }}
                >
                  <div className="truncate font-semibold leading-tight text-slate-900">{employee.name}</div>
                  <div className="flex min-w-0 flex-wrap gap-x-2 text-[11px] leading-tight text-slate-500">
                    {assignedRoles(jobRoles, employee.roleIds).map((role) => (
                      <span key={role.id} className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: role.color }} />
                        {role.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-1.5 text-xs font-medium">
                    {hoursOff ? (
                      <span className={`inline-flex items-center gap-1 ${displayHours > EXPECTED_HOURS ? "text-red-600" : "text-amber-600"}`}>
                        <WarningIcon className="h-3.5 w-3.5" />
                        {split && planHours !== displayHours ? `${planHours} → ${displayHours} h` : `${displayHours} h`}
                        {displayHours > EXPECTED_HOURS ? ", previše" : ", premalo"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckIcon className="h-3.5 w-3.5" />
                        {split && planHours !== displayHours ? `${planHours} → ${displayHours} h` : `${displayHours} h`}
                      </span>
                    )}
                    {asPlanned ? <span className="text-slate-500">· po planu</span> : null}
                    {notEntered ? <span className="text-amber-700">· nije uneseno</span> : null}
                    {confirmed ? <span className="font-semibold text-emerald-700">Potvrđeno</span> : null}
                  </div>
                  {gaps.length > 0 ? (
                    <div className="truncate text-xs font-medium text-amber-700">
                      Rupa: {gaps.map((gap) => `${formatHour(gap.start)} - ${formatHour(gap.end)}`).join(", ")}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col" style={{ width: TIMELINE_WIDTH, height: ROW_HEIGHT }}>
                  {actualsOnly ? (
                    <div className="relative" style={{ height: ROW_HEIGHT }}>
                      <LaneGrid />
                      {actuals.length === 0 ? (
                        <div className="pointer-events-none absolute inset-0 z-[5] flex items-center pl-4 text-sm text-slate-400">
                          Zaposlenik još nije unio sate za ovaj dan.
                        </div>
                      ) : null}
                      {workGaps(actuals).map((gap) => (
                        <GapMark key={`og-${gap.start}-${gap.end}`} start={gap.start} end={gap.end} />
                      ))}
                      {actuals.map((assignment) => renderBlock(employee.id, assignment, false, false, false))}
                    </div>
                  ) : null}
                  <div
                    hidden={actualsOnly}
                    data-touch-timeline={employee.id}
                    className="relative"
                    style={{ height: split ? SPLIT_LANE : ROW_HEIGHT }}
                    onPointerDown={(event) => onLaneDown(employee.id, event)}
                  >
                    {split ? (
                      <span className="pointer-events-none absolute left-0.5 top-0.5 z-20 rounded bg-white/80 px-0.5 text-[8px] font-bold uppercase leading-none text-slate-400">
                        Plan
                      </span>
                    ) : null}
                    <LaneGrid />
                    {selectedRange ? (
                      <div
                        className="pointer-events-none absolute top-1.5 bottom-1.5 z-10 flex items-center justify-center rounded-lg bg-blue-600/20 ring-2 ring-blue-500"
                        style={{
                          left: (selectedRange.start - DAY_START) * HOUR_WIDTH + 2,
                          width: (selectedRange.end - selectedRange.start) * HOUR_WIDTH - 4,
                        }}
                      >
                        <span className="rounded bg-blue-700 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
                          {selectedRange.end - selectedRange.start} h
                        </span>
                      </div>
                    ) : null}
                    {workGaps(planned).map((gap) => (
                      <GapMark key={`pg-${gap.start}-${gap.end}`} start={gap.start} end={gap.end} />
                    ))}
                    {planned.map((assignment) => renderBlock(employee.id, assignment, true, split, split))}
                  </div>
                  {split ? (
                    <div className="relative border-t border-slate-200 bg-slate-50/70" style={{ height: SPLIT_LANE }}>
                      <span className="pointer-events-none absolute left-0.5 top-0.5 z-20 rounded bg-white/90 px-0.5 text-[8px] font-bold uppercase leading-none text-slate-700">
                        Ostv.
                      </span>
                      <LaneGrid />
                      {workGaps(actuals).map((gap) => (
                        <GapMark key={`ag-${gap.start}-${gap.end}`} start={gap.start} end={gap.end} />
                      ))}
                      {actuals.map((assignment) => renderBlock(employee.id, assignment, false, false, true))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {pickedBlock && pickedEmployee ? (
        <div className="absolute inset-x-3 bottom-3 z-40 flex items-center gap-3 rounded-2xl bg-slate-900 p-2 pl-4 text-white shadow-2xl">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: workOrderColor(pickedOrder, workOrderTemplates) }} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {pickedOrder ? workOrderCode(pickedOrder) : ""} · {pickedOrder?.name}
            </div>
            <div className="truncate text-xs text-slate-300">
              {pickedEmployee.name} · {taskLabel(pickedTask)} · {formatHour(pickedBlock.startHour)} - {formatHour(blockEnd(pickedBlock))} · {pickedBlock.durationHours} h
            </div>
          </div>
          <ToolGroup label="Pomak">
            <ToolButton label="1 h ranije" disabled={!canLeft} onClick={() => commitPicked(shiftPicked(-1))}>
              <ChevronLeftIcon className="h-5 w-5" />
            </ToolButton>
            <ToolButton label="1 h kasnije" disabled={!canRight} onClick={() => commitPicked(shiftPicked(1))}>
              <ChevronRightIcon className="h-5 w-5" />
            </ToolButton>
          </ToolGroup>
          <ToolGroup label="Trajanje">
            <ToolButton label="1 h kraće" disabled={!canShrink} onClick={() => commitPicked(resizePicked(-1))}>
              <span className="text-xl font-semibold leading-none">−</span>
            </ToolButton>
            <ToolButton label="1 h dulje" disabled={!canGrow} onClick={() => commitPicked(resizePicked(1))}>
              <span className="text-xl font-semibold leading-none">+</span>
            </ToolButton>
          </ToolGroup>
          <button
            type="button"
            className="flex h-11 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm font-semibold hover:bg-white/20"
            onClick={() => setEdit(picked)}
          >
            <EditIcon className="h-4 w-4" />
            Uredi
          </button>
          <button
            type="button"
            className="flex h-11 items-center gap-1.5 rounded-xl bg-red-600 px-3 text-sm font-semibold hover:bg-red-700"
            onClick={() => picked && deleteAssignment(picked)}
          >
            <TrashIcon className="h-4 w-4" />
            Obriši
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10"
            aria-label="Odznači"
            onClick={() => setPicked(null)}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      {create ? (
        <AssignmentModal
          title="Novi unos u plan"
          startHour={create.startHour}
          endHour={create.endHour}
          workOrders={workOrders}
          tasks={tasks}
          roleIds={createEmployee?.roleIds}
          onClose={() => setCreate(null)}
          onSave={saveCreate}
          touch
        />
      ) : null}

      {edit && editAssignment ? (
        <AssignmentModal
          title="Uredi unos u plan"
          startHour={editAssignment.startHour}
          endHour={blockEnd(editAssignment)}
          workOrders={workOrders}
          tasks={tasks}
          roleIds={editEmployee?.roleIds}
          initialWorkOrderId={editAssignment.workOrderId}
          initialTaskId={editAssignment.taskId}
          onClose={() => setEdit(null)}
          onSave={saveEdit}
          onDelete={() => deleteAssignment(edit)}
          touch
        />
      ) : null}
    </div>
  );
}

function LaneGrid() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-y-0 bg-blue-50/40"
        style={{ left: (CORE_START - DAY_START) * HOUR_WIDTH, width: (CORE_END - CORE_START) * HOUR_WIDTH }}
      />
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="pointer-events-none absolute inset-y-0 border-r border-slate-100"
          style={{ left: (hour - DAY_START) * HOUR_WIDTH, width: HOUR_WIDTH }}
        />
      ))}
    </>
  );
}

function GapMark({ start, end }: { start: number; end: number }) {
  return (
    <div
      className="pointer-events-none absolute top-1.5 bottom-1.5 z-[5] rounded-lg bg-amber-200/40 ring-1 ring-dashed ring-amber-400"
      style={{ left: (start - DAY_START) * HOUR_WIDTH + 2, width: (end - start) * HOUR_WIDTH - 4 }}
    />
  );
}

function ResizeHandle({ side, onPointerDown }: { side: "start" | "end"; onPointerDown: (event: ReactPointerEvent) => void }) {
  return (
    <button
      type="button"
      aria-label={side === "start" ? "Promijeni početak" : "Promijeni završetak"}
      className={`absolute top-1/2 z-20 flex h-11 w-7 -translate-y-1/2 items-center justify-center ${
        side === "start" ? "-left-3.5" : "-right-3.5"
      }`}
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
    >
      <span className="flex h-9 w-4 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-slate-900">
        <span className="h-4 w-0.5 rounded-full bg-slate-400" />
      </span>
    </button>
  );
}

function ToolGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-white/5 py-1 pl-2 pr-1">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </div>
  );
}

function ToolButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
