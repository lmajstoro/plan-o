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
    <section className={`shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3 ${className}`} aria-label="Plan za ovaj dan">
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
          <ul className="mt-2 space-y-1.5">
            {day.planned.map((row) => {
              const order = day.orderById(row.workOrderId);
              const task = day.taskById(row.taskId);
              return (
                <li key={row.id} className="flex items-start gap-2.5 text-sm">
                  <span
                    className="mt-1 h-3 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: workOrderColor(order, day.db.workOrderTemplates) }}
                  />
                  <span className="w-[6.5rem] shrink-0 tabular-nums text-slate-600">
                    {formatHour(row.startHour)} - {formatHour(blockEnd(row))}
                  </span>
                  <span className="min-w-0 flex-1 text-slate-700">
                    <span className="font-medium text-slate-800">
                      {order ? `${employeeOrderNumber(order)} ${order.name}` : "Nepoznat nalog"}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{taskLabel(task)}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-500">{row.durationHours} h</span>
                </li>
              );
            })}
          </ul>
        )
      ) : null}
    </section>
  );
}
