import type { MouseEvent } from "react";
import { DAY_END, DAY_START, blockEnd, hourColumns, occupiedHours } from "../../lib/gantt";
import { formatHour } from "../../lib/dates";
import type { Assignment, Task, WorkOrder } from "../../types";

const HOURS = hourColumns();
export const HOUR_HEIGHT = 56;
const GUTTER = 56;

type Props = {
  assignments: Assignment[];
  workOrders: WorkOrder[];
  tasks: Task[];
  tone: "live" | "past" | "future";
  showNow: boolean;
  onSelectAssignment: (assignment: Assignment) => void;
  onSelectHour: (hour: number) => void;
};

export function DayCalendar({
  assignments,
  workOrders,
  tasks,
  tone,
  showNow,
  onSelectAssignment,
  onSelectHour,
}: Props) {
  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const showNowLine = showNow && nowHour >= DAY_START && nowHour < DAY_END;
  const occupied = occupiedHours(assignments);
  const readOnly = tone !== "live";
  const toneClass =
    tone === "past"
      ? "pointer-events-none select-none opacity-55 grayscale"
      : tone === "future"
        ? "pointer-events-none select-none opacity-40"
        : "";

  function orderById(id: string) {
    return workOrders.find((row) => row.id === id);
  }

  function taskById(id: string) {
    return tasks.find((row) => row.id === id);
  }

  function onGridClick(event: MouseEvent<HTMLDivElement>) {
    if (readOnly) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const hour = Math.min(DAY_END - 1, DAY_START + Math.floor((event.clientY - rect.top) / HOUR_HEIGHT));
    if (occupied.has(hour)) return;
    onSelectHour(hour);
  }

  return (
    <div className={`relative pt-3 ${toneClass}`}>
      <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }} onClick={onGridClick}>
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-t border-slate-200"
            style={{ top: (hour - DAY_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          >
            <div className="absolute -top-2.5 left-0 w-14 pr-2 text-right text-[11px] text-slate-400">
              {formatHour(hour)}
            </div>
          </div>
        ))}

        {assignments.map((assignment) => {
          const order = orderById(assignment.workOrderId);
          const task = taskById(assignment.taskId);
          return (
            <button
              key={assignment.id}
              type="button"
              disabled={readOnly}
              className="absolute z-10 overflow-hidden rounded-lg px-2.5 py-1.5 text-left text-white shadow-sm disabled:pointer-events-none"
              style={{
                top: (assignment.startHour - DAY_START) * HOUR_HEIGHT + 2,
                height: assignment.durationHours * HOUR_HEIGHT - 4,
                left: GUTTER,
                right: 10,
                backgroundColor: order?.color ?? "#334155",
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (!readOnly) onSelectAssignment(assignment);
              }}
            >
              <div className="truncate text-[13px] font-semibold leading-tight">
                {order?.code} · {order?.name}
              </div>
              <div className="truncate text-[12px] leading-tight text-white/90">
                {formatHour(assignment.startHour)} - {formatHour(blockEnd(assignment))} · {task?.code} {task?.name}
              </div>
            </button>
          );
        })}

        {showNowLine ? (
          <div
            className="pointer-events-none absolute z-20 right-2 flex items-center"
            style={{ top: (nowHour - DAY_START) * HOUR_HEIGHT, left: GUTTER - 8 }}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="h-0.5 flex-1 bg-red-500" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
