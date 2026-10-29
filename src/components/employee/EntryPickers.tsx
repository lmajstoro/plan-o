import { useEffect, type ReactNode } from "react";
import { ChevronLeftIcon, CloseIcon } from "../icons";
import { useLockPageScroll } from "../../lib/scrollLock";
import { employeeOrderNumber, taskLabel, workOrderColor } from "../../lib/workOrders";
import type { EmployeeDay } from "../../lib/useEmployeeDay";
import type { Task, WorkOrder } from "../../types";

export function BottomSheet({
  title,
  subtitle,
  onClose,
  onBack,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useLockPageScroll();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden overscroll-none md:items-center md:p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Zatvori" onClick={onClose} />
      <div
        role="dialog"
        aria-label={title}
        className="relative flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-2xl md:max-w-lg md:rounded-2xl"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-2 py-2">
          {onBack ? (
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" onClick={onBack} aria-label="Natrag">
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
          ) : (
            <span className="w-2" />
          )}
          <div className="min-w-0 flex-1">
            {subtitle ? <p className="text-xs font-medium text-slate-500">{subtitle}</p> : null}
            <h2 className="truncate text-lg font-semibold text-slate-900">{title}</h2>
          </div>
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Zatvori">
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4" data-allow-scroll>
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-100 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
        ) : (
          <div className="shrink-0 pb-[env(safe-area-inset-bottom)]" />
        )}
      </div>
    </div>
  );
}

export function OrderLabel({ order }: { order: WorkOrder | undefined }) {
  if (!order) return <span>Nepoznat nalog</span>;
  return (
    <>
      <span className="tabular-nums">{employeeOrderNumber(order)}</span> {order.name}
    </>
  );
}

export function OrderChoiceList({
  day,
  selectedId,
  currentId,
  onSelect,
}: {
  day: EmployeeDay;
  selectedId?: string;
  currentId?: string;
  onSelect: (id: string) => void;
}) {
  const orders = day.orderOptions(currentId);
  const inPlan = orders.filter((order) => day.plannedOrderIds.has(order.id));
  const others = orders.filter((order) => !day.plannedOrderIds.has(order.id));

  if (orders.length === 0) {
    return <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Nema aktivnih radnih naloga.</p>;
  }

  function renderOrder(order: WorkOrder) {
    const selected = order.id === selectedId;
    return (
      <li key={order.id}>
        <button
          type="button"
          disabled={order.archived}
          onClick={() => onSelect(order.id)}
          className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-50 ${
            selected ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200" : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <span
            className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg px-1.5 text-base font-bold tabular-nums text-white"
            style={{ backgroundColor: workOrderColor(order, day.db.workOrderTemplates) }}
          >
            {employeeOrderNumber(order)}
          </span>
          <span className="min-w-0 flex-1 text-base font-medium text-slate-900">{order.name}</span>
        </button>
      </li>
    );
  }

  return (
    <div className="space-y-4">
      {inPlan.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">U planu za ovaj dan</p>
          <ul className="space-y-2">{inPlan.map(renderOrder)}</ul>
        </div>
      ) : null}
      {others.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {inPlan.length > 0 ? "Ostali nalozi" : "Radni nalozi"}
          </p>
          <ul className="space-y-2">{others.map(renderOrder)}</ul>
        </div>
      ) : null}
    </div>
  );
}

export function TaskChoiceList({
  tasks,
  selectedId,
  onSelect,
}: {
  tasks: Task[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (tasks.length === 0) {
    return <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Ovaj nalog nema zadataka za tvoje uloge.</p>;
  }
  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const selected = task.id === selectedId;
        return (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => onSelect(task.id)}
              className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                selected ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <span className="w-14 shrink-0 text-sm font-semibold text-slate-500">{task.code}</span>
              <span className="min-w-0 flex-1 text-base font-medium text-slate-900">{task.description || taskLabel(task)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ChoiceGrid<T extends number>({
  values,
  selected,
  onSelect,
  render,
  columns = 4,
}: {
  values: T[];
  selected?: T | null;
  onSelect: (value: T) => void;
  render: (value: T) => ReactNode;
  columns?: 3 | 4;
}) {
  return (
    <div className={`grid gap-2 ${columns === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
      {values.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className={`flex h-14 items-center justify-center rounded-xl border text-lg font-semibold tabular-nums transition ${
            value === selected
              ? "border-blue-700 bg-blue-700 text-white"
              : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
          }`}
        >
          {render(value)}
        </button>
      ))}
    </div>
  );
}
