import { useState } from "react";
import { ChevronDownIcon } from "../icons";
import { formatHour } from "../../lib/dates";
import { blockEnd } from "../../lib/gantt";
import { employeeOrderNumber, taskLabel, workOrderColor } from "../../lib/workOrders";
import type { EmployeeDay } from "../../lib/useEmployeeDay";

type Props = {
  day: EmployeeDay;
  collapsible?: boolean;
  className?: string;
};

/** Read-only reference of what the admin planned. Never used as a source for entered hours. */
export function PlanPanel({ day, collapsible = false, className = "" }: Props) {
  const [open, setOpen] = useState(true);
  const expanded = !collapsible || open;

  const heading = (
    <>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan za ovaj dan</span>
      <span className="ml-auto text-sm text-slate-600">
        Planirano <span className="font-semibold tabular-nums text-slate-800">{day.plannedHours} h</span>
      </span>
    </>
  );

  return (
    <section className={`shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2 ${className}`} aria-label="Plan za ovaj dan">
      {collapsible ? (
        <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          {heading}
          <ChevronDownIcon className={`h-4 w-4 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <div className="flex items-center gap-2">{heading}</div>
      )}

      {expanded ? (
        day.planned.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Za ovaj dan nema plana.</p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {day.planned.map((row) => {
              const order = day.orderById(row.workOrderId);
              const task = day.taskById(row.taskId);
              const label = order ? `${employeeOrderNumber(order)} ${order.name}` : "Nepoznat nalog";
              const taskText = taskLabel(task);
              return (
                <li key={row.id} className="flex gap-2 text-sm">
                  <span
                    className="mt-1.5 h-3 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: workOrderColor(order, day.db.workOrderTemplates) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="shrink-0 tabular-nums text-slate-600">
                        {formatHour(row.startHour)}-{formatHour(blockEnd(row))}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{label}</span>
                      <span className="shrink-0 tabular-nums text-slate-500">{row.durationHours} h</span>
                    </div>
                    {taskText ? <p className="text-slate-600">{taskText}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : null}
    </section>
  );
}
