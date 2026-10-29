import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatHour } from "../../lib/dates";
import { selectableWorkOrders, taskLabel, tasksForWorkOrder, workOrderCode } from "../../lib/workOrders";
import { Modal } from "../ui/Modal";
import { PickerSelect } from "../ui/PickerSelect";
import type { Role, Task, WorkOrder } from "../../types";

type Props = {
  title: string;
  startHour: number;
  endHour: number;
  workOrders: WorkOrder[];
  tasks: Task[];
  roleIds?: Role[];
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
  roleIds,
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
  const availableTasks = tasksForWorkOrder(selectedOrder, tasks, roleIds);
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
    if (!workOrderId || !taskId) return;
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
        <form onSubmit={submit} className="space-y-3">
          <Field label="Radni nalog" touch={touch}>
            {touch ? (
              <PickerSelect
                value={workOrderId}
                options={orders.map((order) => ({ value: order.id, label: `${workOrderCode(order)} ${order.name}` }))}
                onChange={setWorkOrderId}
              />
            ) : (
              <select className="input" required value={workOrderId} onChange={(event) => setWorkOrderId(event.target.value)}>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {workOrderCode(order)} {order.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Zadatak" touch={touch}>
            {availableTasks.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Ovaj nalog nema zadataka za ove uloge.
              </p>
            ) : touch ? (
              <PickerSelect
                value={taskId}
                options={availableTasks.map((task) => ({ value: task.id, label: taskLabel(task) }))}
                onChange={setTaskId}
              />
            ) : (
              <select className="input" required value={taskId} onChange={(event) => setTaskId(event.target.value)}>
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

function Field({ label, touch, children }: { label: string; touch?: boolean; children: ReactNode }) {
  const Wrapper = touch ? "div" : "label";
  return (
    <Wrapper className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </Wrapper>
  );
}
