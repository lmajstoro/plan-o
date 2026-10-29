import { FormEvent, useState } from "react";
import { BottomSheet, Stepper } from "./EntryPickers";
import { formatHour } from "../../lib/dates";
import { blockEnd, DAY_END, DAY_START, totalHours } from "../../lib/gantt";
import { HOURS_TONE_TEXT, hoursTone, type EmployeeDay } from "../../lib/useEmployeeDay";
import { employeeOrderNumber, taskLabel } from "../../lib/workOrders";
import type { Assignment } from "../../types";

export type CalendarSheetState =
  | { mode: "create"; startHour: number }
  | { mode: "edit"; assignment: Assignment };

type Props = {
  day: EmployeeDay;
  state: CalendarSheetState;
  onClose: () => void;
};

export function EmployeeAssignmentSheet({ day, state, onClose }: Props) {
  const editing = state.mode === "edit" ? state.assignment : null;
  const initialStart = state.mode === "edit" ? state.assignment.startHour : Math.min(state.startHour, DAY_END - 1);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(editing ? blockEnd(editing) : initialStart + 1);
  const [workOrderId, setWorkOrderId] = useState(editing?.workOrderId ?? "");
  const [taskId, setTaskId] = useState(editing?.taskId ?? "");

  const orders = day.orderOptions(editing?.workOrderId);
  const inPlan = orders.filter((order) => day.plannedOrderIds.has(order.id));
  const others = orders.filter((order) => !day.plannedOrderIds.has(order.id));
  const tasks = workOrderId ? day.tasksFor(workOrderId) : [];
  const selectedOrder = orders.find((order) => order.id === workOrderId);
  const duration = end - start;
  const otherHours = totalHours(day.actuals.filter((row) => row.id !== editing?.id));
  const dayTotal = otherHours + duration;
  const canSave = Boolean(workOrderId && taskId && tasks.some((task) => task.id === taskId)) && !selectedOrder?.archived;

  function changeOrder(id: string) {
    setWorkOrderId(id);
    if (!day.tasksFor(id).some((task) => task.id === taskId)) setTaskId("");
  }

  function moveStart(delta: number) {
    const next = Math.min(DAY_END - 1, Math.max(DAY_START, start + delta));
    setStart(next);
    if (end <= next) setEnd(next + 1);
  }

  function moveEnd(delta: number) {
    setEnd(Math.min(DAY_END, Math.max(start + 1, end + delta)));
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSave) return;
    const draft = { workOrderId, taskId, startHour: start, durationHours: duration };
    const saved = editing ? day.updateEntry(editing.id, draft) : day.addEntry(draft);
    if (saved) onClose();
  }

  function remove() {
    if (!editing) return;
    if (day.deleteEntry(editing.id)) onClose();
  }

  function close() {
    day.setError("");
    onClose();
  }

  return (
    <BottomSheet
      title={editing ? "Uredi upisane sate" : "Upiši sate"}
      onClose={close}
      footer={
        <div className="flex items-center gap-2">
          {editing ? (
            <button type="button" className="btn-secondary h-12 text-base text-red-700" onClick={remove}>
              Obriši
            </button>
          ) : null}
          <button type="button" className="btn-secondary h-12 flex-1 text-base" onClick={close}>
            Odustani
          </button>
          <button
            type="submit"
            form="calendar-entry-form"
            className="btn-primary h-12 flex-1 text-base disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canSave}
          >
            Spremi
          </button>
        </div>
      }
    >
      <form id="calendar-entry-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Stepper
            label="Od"
            display={formatHour(start)}
            onMinus={() => moveStart(-1)}
            onPlus={() => moveStart(1)}
            minusDisabled={start <= DAY_START}
            plusDisabled={start >= DAY_END - 1}
            minusLabel="Početak sat ranije"
            plusLabel="Početak sat kasnije"
          />
          <Stepper
            label="Do"
            display={formatHour(end)}
            onMinus={() => moveEnd(-1)}
            onPlus={() => moveEnd(1)}
            minusDisabled={end <= start + 1}
            plusDisabled={end >= DAY_END}
            minusLabel="Kraj sat ranije"
            plusLabel="Kraj sat kasnije"
          />
        </div>
        <p className="text-sm text-slate-600">
          Ovaj unos: <span className="font-semibold text-slate-900">{duration} h</span>. Ukupno ovaj dan:{" "}
          <span className={`font-semibold ${HOURS_TONE_TEXT[hoursTone(dayTotal)]}`}>{dayTotal} h</span>
        </p>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Radni nalog</span>
          {orders.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Nema aktivnih radnih naloga.</p>
          ) : (
            <select className="input h-12 text-base" required value={workOrderId} onChange={(event) => changeOrder(event.target.value)}>
              <option value="" disabled>
                Odaberi nalog
              </option>
              {inPlan.length > 0 ? (
                <optgroup label="U planu za ovaj dan">
                  {inPlan.map((order) => (
                    <option key={order.id} value={order.id}>
                      {employeeOrderNumber(order)} {order.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <optgroup label={inPlan.length > 0 ? "Ostali nalozi" : "Radni nalozi"}>
                {others.map((order) => (
                  <option key={order.id} value={order.id}>
                    {employeeOrderNumber(order)} {order.name}
                  </option>
                ))}
              </optgroup>
            </select>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Zadatak</span>
          {workOrderId && tasks.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Ovaj nalog nema zadataka za tvoje uloge.</p>
          ) : (
            <select
              className="input h-12 text-base disabled:bg-slate-50 disabled:text-slate-400"
              required
              disabled={!workOrderId}
              value={taskId}
              onChange={(event) => setTaskId(event.target.value)}
            >
              <option value="" disabled>
                {workOrderId ? "Odaberi zadatak" : "Prvo odaberi nalog"}
              </option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {taskLabel(task)}
                </option>
              ))}
            </select>
          )}
        </label>

        {day.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{day.error}</p> : null}
      </form>
    </BottomSheet>
  );
}
