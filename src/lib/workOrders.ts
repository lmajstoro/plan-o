import { ROLE_LABELS } from "./dates";
import type { Role, Task, WorkOrder, WorkOrderStatus } from "../types";

export const WORK_ORDER_STATUSES: WorkOrderStatus[] = ["otvoren", "u_tijeku", "zavrsen"];

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  otvoren: "Otvoren",
  u_tijeku: "U tijeku",
  zavrsen: "Završen",
};

const STATUS_RANK: Record<WorkOrderStatus, number> = {
  u_tijeku: 0,
  otvoren: 1,
  zavrsen: 2,
};

export function workOrderStatusClass(status: WorkOrderStatus, archived: boolean): string {
  if (archived) return "bg-slate-100 text-slate-500";
  if (status === "u_tijeku") return "bg-blue-50 text-blue-800";
  if (status === "zavrsen") return "bg-emerald-50 text-emerald-800";
  return "bg-amber-50 text-amber-800";
}

export function sortWorkOrders(orders: WorkOrder[]): WorkOrder[] {
  return [...orders].sort((a, b) => {
    const archivedA = Boolean(a.archived);
    const archivedB = Boolean(b.archived);
    if (archivedA !== archivedB) return archivedA ? 1 : -1;
    const rank = (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99);
    if (rank !== 0) return rank;
    return a.code.localeCompare(b.code, "hr");
  });
}

export function selectableWorkOrders(orders: WorkOrder[], currentId?: string): WorkOrder[] {
  return sortWorkOrders(orders.filter((order) => !order.archived || order.id === currentId));
}

export function tasksForWorkOrder(order: WorkOrder | undefined, tasks: Task[], role?: Role): Task[] {
  if (!order) return [];
  const allowed = new Set(order.taskIds ?? []);
  return tasks.filter((task) => allowed.has(task.id) && (!role || task.role === role));
}

export function isArchivedWorkOrder(order: WorkOrder | undefined): boolean {
  return Boolean(order?.archived);
}

export function taskRoleGroups(tasks: Task[]): { role: Role; label: string; tasks: Task[] }[] {
  const roles: Role[] = ["montazer", "serviser", "elektromonter"];
  return roles.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    tasks: tasks.filter((task) => task.role === role),
  }));
}
