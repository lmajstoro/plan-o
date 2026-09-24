import { FormEvent, useEffect, useMemo, useState } from "react";
import { CloseIcon } from "../icons";
import { formatHour } from "../../lib/dates";
import { DAY_END, DAY_START, hourColumns } from "../../lib/gantt";
import { useLockPageScroll } from "../../lib/scrollLock";
import { selectableWorkOrders, tasksForWorkOrder } from "../../lib/workOrders";
import type { Role, Task, WorkOrder } from "../../types";

type Props = {
  title: string;
  startHour: number;
  durationHours: number;
  workOrders: WorkOrder[];
  tasks: Task[];
  role?: Role;
  initialWorkOrderId?: string;
  initialTaskId?: string;
  error?: string;
  onClose: () => void;
  onSave: (workOrderId: string, taskId: string, startHour: number, durationHours: number) => void;
  onDelete?: () => void;
};

export function EmployeeAssignmentSheet({
  title,
  startHour,
  durationHours,
  workOrders,
  tasks,
  role,
  initialWorkOrderId,
  initialTaskId,
  error,
  onClose,
  onSave,
  onDelete,
}: Props) {
  useLockPageScroll();
  const hours = hourColumns();
  const orders = useMemo(() => selectableWorkOrders(workOrders, initialWorkOrderId), [workOrders, initialWorkOrderId]);
  const [workOrderId, setWorkOrderId] = useState(initialWorkOrderId ?? orders[0]?.id ?? "");
  const selectedOrder = orders.find((order) => order.id === workOrderId);
  const availableTasks = tasksForWorkOrder(selectedOrder, tasks, role);
  const [taskId, setTaskId] = useState(
    initialTaskId && availableTasks.some((task) => task.id === initialTaskId)
      ? initialTaskId
      : availableTasks[0]?.id ?? "",
  );

  useEffect(() => {
    if (!availableTasks.some((task) => task.id === taskId)) {
      setTaskId(availableTasks[0]?.id ?? "");
    }
  }, [availableTasks, taskId]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextStart = Number(data.get("startHour"));
    const nextDuration = Number(data.get("durationHours"));
    if (!workOrderId || !taskId) return;
    if (selectedOrder?.archived) return;
    if (!Number.isFinite(nextStart) || !Number.isFinite(nextDuration)) return;
    onSave(workOrderId, taskId, nextStart, nextDuration);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden overscroll-none">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Zatvori" onClick={onClose} />
      <div
        className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
        data-allow-scroll
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button type="button" className="rounded-md p-2 text-slate-500" onClick={onClose}>
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Početak</span>
              <select name="startHour" className="input text-base" defaultValue={startHour} required>
                {hours.map((hour) => (
                  <option key={hour} value={hour}>
                    {formatHour(hour)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Trajanje</span>
              <select name="durationHours" className="input text-base" defaultValue={durationHours} required>
                {Array.from({ length: DAY_END - DAY_START }, (_, index) => index + 1).map((hoursCount) => (
                  <option key={hoursCount} value={hoursCount}>
                    {hoursCount} h
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Radni nalog</span>
            {orders.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Nema aktivnih radnih naloga.</p>
            ) : (
              <select className="input text-base" required value={workOrderId} onChange={(event) => setWorkOrderId(event.target.value)}>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.code} {order.name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Zadatak</span>
            {availableTasks.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Ovaj nalog nema zadataka za tvoju ulogu.
              </p>
            ) : (
              <select className="input text-base" required value={taskId} onChange={(event) => setTaskId(event.target.value)}>
                {availableTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.code} {task.name}
                  </option>
                ))}
              </select>
            )}
          </label>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <div className="flex items-center justify-between gap-2 pt-1">
            {onDelete ? (
              <button type="button" className="btn-danger" onClick={onDelete}>
                Obriši
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Odustani
              </button>
              <button type="submit" className="btn-primary" disabled={!workOrderId || !taskId || selectedOrder?.archived}>
                Spremi
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
