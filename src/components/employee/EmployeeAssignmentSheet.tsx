import { FormEvent, useEffect, useMemo, useState } from "react";
import { CloseIcon } from "../icons";
import { formatHour } from "../../lib/dates";
import { DAY_END, DAY_START, EXPECTED_HOURS, hourColumns } from "../../lib/gantt";
import { useLockPageScroll } from "../../lib/scrollLock";
import { sortWorkOrdersForEmployeeDay, taskRoleGroups, tasksForWorkOrder } from "../../lib/workOrders";
import type { JobRole, Role, Task, WorkOrder } from "../../types";

type Props = {
  title: string;
  startHour: number;
  durationHours: number;
  workOrders: WorkOrder[];
  tasks: Task[];
  jobRoles?: JobRole[];
  roleIds?: Role[];
  dayWorkOrderIds?: string[];
  otherHours?: number;
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
  jobRoles = [],
  roleIds,
  dayWorkOrderIds = [],
  otherHours = 0,
  initialWorkOrderId,
  initialTaskId,
  error,
  onClose,
  onSave,
  onDelete,
}: Props) {
  useLockPageScroll();
  const hours = hourColumns();
  const [nextStart, setNextStart] = useState(startHour);
  const [nextDuration, setNextDuration] = useState(durationHours);
  const orders = useMemo(
    () => sortWorkOrdersForEmployeeDay(workOrders, dayWorkOrderIds, initialWorkOrderId),
    [workOrders, dayWorkOrderIds, initialWorkOrderId],
  );
  const [workOrderId, setWorkOrderId] = useState(initialWorkOrderId ?? orders[0]?.id ?? "");
  const selectedOrder = orders.find((order) => order.id === workOrderId);
  const availableTasks = tasksForWorkOrder(selectedOrder, tasks, roleIds);
  const taskGroups = useMemo(() => {
    const roles = jobRoles.filter((role) => !roleIds || roleIds.includes(role.id));
    return taskRoleGroups(availableTasks, roles).filter((group) => group.tasks.length > 0);
  }, [availableTasks, jobRoles, roleIds]);
  const [taskId, setTaskId] = useState(
    initialTaskId && availableTasks.some((task) => task.id === initialTaskId)
      ? initialTaskId
      : availableTasks[0]?.id ?? "",
  );
  const dayTotal = otherHours + nextDuration;
  const hoursTone =
    dayTotal === EXPECTED_HOURS ? "text-emerald-700" : dayTotal > EXPECTED_HOURS ? "text-red-600" : "text-amber-700";

  useEffect(() => {
    if (!availableTasks.some((task) => task.id === taskId)) {
      setTaskId(availableTasks[0]?.id ?? "");
    }
  }, [availableTasks, taskId]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workOrderId || !taskId) return;
    if (selectedOrder?.archived) return;
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
          <p className={`text-sm font-medium ${hoursTone}`}>Ukupno ovaj dan: {dayTotal} h</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Početak</span>
              <select
                name="startHour"
                className="input text-base"
                value={nextStart}
                onChange={(event) => setNextStart(Number(event.target.value))}
                required
              >
                {hours.map((hour) => (
                  <option key={hour} value={hour}>
                    {formatHour(hour)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Trajanje</span>
              <select
                name="durationHours"
                className="input text-base"
                value={nextDuration}
                onChange={(event) => setNextDuration(Number(event.target.value))}
                required
              >
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
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Zadatak</span>
            {availableTasks.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Ovaj nalog nema zadataka za tvoje uloge.
              </p>
            ) : (
              <div className="space-y-3">
                {taskGroups.map((group) => (
                  <div key={group.role}>
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: group.color }} />
                      {group.label}
                    </div>
                    <div className="space-y-1.5">
                      {group.tasks.map((task) => {
                        const selected = taskId === task.id;
                        return (
                          <label
                            key={task.id}
                            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                              selected ? "border-blue-700 bg-blue-50 text-slate-900" : "border-slate-200 text-slate-700"
                            }`}
                          >
                            <input
                              type="radio"
                              className="mt-0.5"
                              name="taskId"
                              checked={selected}
                              onChange={() => setTaskId(task.id)}
                            />
                            <span>
                              <span className="font-mono text-slate-500">{task.code}</span> {task.description}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
