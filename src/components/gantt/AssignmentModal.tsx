import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatHour } from "../../lib/dates";
import { tasksEmployeeMayDo, type Capable } from "../../lib/skills";
import { selectableWorkOrders, taskLabel, workOrderCode } from "../../lib/workOrders";
import { FieldError, inputClass, useFieldErrors } from "../ui/field";
import { Modal } from "../ui/Modal";
import { PickerSelect } from "../ui/PickerSelect";
import type { Task, WorkOrder } from "../../types";

type Props = {
  title: string;
  startHour: number;
  endHour: number;
  workOrders: WorkOrder[];
  tasks: Task[];
  person?: Capable;
  initialWorkOrderId?: string;
  initialTaskId?: string;
  onClose: () => void;
  onSave: (workOrderId: string, taskId: string) => void;
  onDelete?: () => void;
  error?: string;
  touch?: boolean;
};

export function AssignmentModal({
  title,
  startHour,
  endHour,
  workOrders,
  tasks,
  person,
  initialWorkOrderId,
  initialTaskId,
  onClose,
  onSave,
  onDelete,
  error,
  touch,
}: Props) {
  const orders = useMemo(() => selectableWorkOrders(workOrders, initialWorkOrderId), [workOrders, initialWorkOrderId]);
  const [workOrderId, setWorkOrderId] = useState(initialWorkOrderId ?? orders[0]?.id ?? "");
  const selectedOrder = orders.find((order) => order.id === workOrderId);
  const availableTasks = tasksEmployeeMayDo(selectedOrder, tasks, person);
  const [taskId, setTaskId] = useState(
    initialTaskId && availableTasks.some((task) => task.id === initialTaskId)
      ? initialTaskId
      : availableTasks[0]?.id ?? "",
  );
  const fields = useFieldErrors();

  useEffect(() => {
    if (!availableTasks.some((task) => task.id === taskId)) {
      setTaskId(availableTasks[0]?.id ?? "");
    }
  }, [availableTasks, taskId]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!workOrderId) nextErrors.workOrderId = "Odaberi radni nalog.";
    if (!taskId) nextErrors.taskId = "Odaberi zadatak.";
    if (fields.reject(nextErrors)) return;
    if (selectedOrder?.archived) return;
    onSave(workOrderId, taskId);
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-600">
        Odabrano vrijeme:{" "}
        <span className="font-medium text-slate-800">
          {formatHour(startHour)} - {formatHour(endHour)} · {endHour - startHour} h
        </span>
      </p>
      {orders.length === 0 ? (
        <p className="text-sm text-amber-700">Nema aktivnih radnih naloga za unos sati.</p>
      ) : (
        <form noValidate onSubmit={submit} className="space-y-3">
          <Field label="Radni nalog" touch={touch} error={fields.errors.workOrderId}>
            {touch ? (
              <PickerSelect
                value={workOrderId}
                invalid={Boolean(fields.errors.workOrderId)}
                options={orders.map((order) => ({ value: order.id, label: `${workOrderCode(order)} ${order.name}` }))}
                onChange={(value) => {
                  fields.clear("workOrderId");
                  setWorkOrderId(value);
                }}
              />
            ) : (
              <select className={inputClass(Boolean(fields.errors.workOrderId))} value={workOrderId} onChange={(event) => { fields.clear("workOrderId"); setWorkOrderId(event.target.value); }}>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {workOrderCode(order)} {order.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Zadatak" touch={touch} error={fields.errors.taskId}>
            {availableTasks.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Ovaj nalog nema zadataka za ove uloge.
              </p>
            ) : touch ? (
              <PickerSelect
                value={taskId}
                invalid={Boolean(fields.errors.taskId)}
                options={availableTasks.map((task) => ({ value: task.id, label: taskLabel(task) }))}
                onChange={(value) => {
                  fields.clear("taskId");
                  setTaskId(value);
                }}
              />
            ) : (
              <select className={inputClass(Boolean(fields.errors.taskId))} value={taskId} onChange={(event) => { fields.clear("taskId"); setTaskId(event.target.value); }}>
                {availableTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {taskLabel(task)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <div className="flex items-center justify-between gap-2 pt-2">
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
      )}
    </Modal>
  );
}

function Field({ label, touch, error, children }: { label: string; touch?: boolean; error?: string; children: ReactNode }) {
  const Wrapper = touch ? "div" : "label";
  return (
    <Wrapper className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      <FieldError message={error} />
    </Wrapper>
  );
}
