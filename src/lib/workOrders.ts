import { roleColor, roleName, sortJobRoles } from "./roles";
import type { JobRole, Role, Task, WorkOrder, WorkOrderStatus, WorkOrderTemplate } from "../types";

export const WORK_ORDER_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#ea580c",
  "#0d9488",
  "#7c3aed",
  "#9f1239",
  "#0284c7",
  "#4f46e5",
  "#65a30d",
  "#c2410c",
  "#155e75",
  "#78716c",
  "#db2777",
  "#a16207",
];

export const WORK_ORDER_COLOR_LABELS: Record<string, string> = {
  "#2563eb": "Plava",
  "#dc2626": "Crvena",
  "#16a34a": "Zelena",
  "#ca8a04": "Žuta",
  "#ea580c": "Narančasta",
  "#0d9488": "Tirkizna",
  "#7c3aed": "Ljubičasta",
  "#9f1239": "Bordo",
  "#0284c7": "Nebeskoplava",
  "#4f46e5": "Indigo",
  "#65a30d": "Maslinasta",
  "#c2410c": "Bakrena",
  "#155e75": "Petrol",
  "#78716c": "Siva",
  "#db2777": "Ružičasta",
  "#a16207": "Zlatna",
};

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

export function sortWorkOrdersForEmployeeDay(
  orders: WorkOrder[],
  dayWorkOrderIds: string[],
  currentId?: string,
): WorkOrder[] {
  const selectable = selectableWorkOrders(orders, currentId);
  const dayIndex = new Map<string, number>();
  for (const id of dayWorkOrderIds) {
    if (!dayIndex.has(id)) dayIndex.set(id, dayIndex.size);
  }
  const onDay = selectable
    .filter((order) => dayIndex.has(order.id))
    .sort((a, b) => (dayIndex.get(a.id) ?? 0) - (dayIndex.get(b.id) ?? 0));
  const rest = selectable
    .filter((order) => !dayIndex.has(order.id))
    .sort((a, b) => {
      const byNumber = workOrderNumber(b.code) - workOrderNumber(a.code);
      if (byNumber !== 0) return byNumber;
      return b.code.localeCompare(a.code, "hr");
    });
  return [...onDay, ...rest];
}

export function taskLabel(task: Pick<Task, "code" | "description"> | undefined): string {
  if (!task) return "";
  return [task.code, task.description].filter(Boolean).join(" ");
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

export function taskRoleGroups(
  tasks: Task[],
  roles: JobRole[],
): { role: Role; label: string; color: string; tasks: Task[] }[] {
  const seen = new Set<string>();
  const groups = sortJobRoles(roles).map((role) => {
    seen.add(role.id);
    return {
      role: role.id,
      label: role.name,
      color: role.color,
      tasks: tasks.filter((task) => task.role === role.id),
    };
  });
  const unknown = [...new Set(tasks.map((task) => task.role).filter((id) => !seen.has(id)))];
  for (const id of unknown) {
    groups.push({
      role: id,
      label: roleName(roles, id),
      color: roleColor(roles, id),
      tasks: tasks.filter((task) => task.role === id),
    });
  }
  return groups;
}

export function sortTemplates(templates: WorkOrderTemplate[]): WorkOrderTemplate[] {
  return [...templates].sort((a, b) => a.name.localeCompare(b.name, "hr"));
}

export function templateName(templates: WorkOrderTemplate[], id: string): string {
  return templates.find((row) => row.id === id)?.name ?? "Nepoznat predložak";
}

export function workOrderColor(
  order: Pick<WorkOrder, "color" | "templateId"> | undefined,
  templates: WorkOrderTemplate[],
): string {
  if (!order) return "#334155";
  if (order.color) return order.color;
  return templates.find((row) => row.id === order.templateId)?.color ?? "#334155";
}

export function templateUsage(templateId: string, orders: WorkOrder[]): number {
  return orders.filter((order) => order.templateId === templateId).length;
}
