import { roleName, sortJobRoles } from "./roles";
import type { JobRole, Role, Task, WorkOrder, WorkOrderStatus } from "../types";

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

export function workOrderNumber(code: string): number {
  const match = /^RN-(\d+)$/i.exec(code.trim());
  return match ? Number(match[1]) : 0;
}

export function nextWorkOrderCode(orders: WorkOrder[]): string {
  const next = Math.max(0, ...orders.map((order) => workOrderNumber(order.code))) + 1;
  return `RN-${String(next).padStart(2, "0")}`;
}

export function sortWorkOrders(orders: WorkOrder[]): WorkOrder[] {
  return [...orders].sort((a, b) => {
    const archivedA = Boolean(a.archived);
    const archivedB = Boolean(b.archived);
    if (archivedA !== archivedB) return archivedA ? 1 : -1;
    const rank = (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99);
    if (rank !== 0) return rank;
    const byNumber = workOrderNumber(a.code) - workOrderNumber(b.code);
    if (byNumber !== 0) return byNumber;
    return a.code.localeCompare(b.code, "hr");
  });
}

export function selectableWorkOrders(orders: WorkOrder[], currentId?: string): WorkOrder[] {
  return sortWorkOrders(orders.filter((order) => !order.archived || order.id === currentId));
}

export function tasksForWorkOrder(order: WorkOrder | undefined, tasks: Task[], roles?: Role | Role[]): Task[] {
  if (!order) return [];
  const allowed = new Set(order.taskIds ?? []);
  const roleIds = roles == null ? null : Array.isArray(roles) ? roles : [roles];
  return tasks.filter((task) => {
    if (!allowed.has(task.id)) return false;
    if (roleIds == null) return true;
    return roleIds.includes(task.role);
  });
}

export function isArchivedWorkOrder(order: WorkOrder | undefined): boolean {
  return Boolean(order?.archived);
}

export function taskRoleGroups(tasks: Task[], roles: JobRole[]): { role: Role; label: string; tasks: Task[] }[] {
  const seen = new Set<string>();
  const groups = sortJobRoles(roles).map((role) => {
    seen.add(role.id);
    return {
      role: role.id,
      label: role.name,
      tasks: tasks.filter((task) => task.role === role.id),
    };
  });
  const unknown = [...new Set(tasks.map((task) => task.role).filter((id) => !seen.has(id)))];
  for (const id of unknown) {
    groups.push({
      role: id,
      label: roleName(roles, id),
      tasks: tasks.filter((task) => task.role === id),
    });
  }
  return groups;
}
