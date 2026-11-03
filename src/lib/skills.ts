import type { Employee, JobRole, Task, WorkOrder } from "../types";
import { assignedRoles, roleColor } from "./roles";
import { taskLabel, tasksForWorkOrder } from "./workOrders";

export type Capable = Pick<Employee, "roleIds" | "taskIds">;

export function canDoTask(person: Capable, task: Pick<Task, "id" | "role">): boolean {
  return person.roleIds.includes(task.role) || (person.taskIds ?? []).includes(task.id);
}

export function tasksEmployeeMayDo(order: WorkOrder | undefined, tasks: Task[], person?: Capable): Task[] {
  const onOrder = tasksForWorkOrder(order, tasks);
  if (!person) return onOrder;
  return onOrder.filter((task) => canDoTask(person, task));
}

export function coversRole(person: Capable, tasks: Pick<Task, "id" | "role">[], roleId: string): boolean {
  return person.roleIds.includes(roleId) || tasks.some((task) => task.role === roleId && (person.taskIds ?? []).includes(task.id));
}

export function skillLabels(person: Capable, roles: JobRole[], tasks: Task[]): { key: string; color: string; text: string }[] {
  const full = assignedRoles(roles, person.roleIds).map((role) => ({
    key: `role-${role.id}`,
    color: role.color,
    text: role.name,
  }));
  const partial = tasks
    .filter((task) => (person.taskIds ?? []).includes(task.id) && !person.roleIds.includes(task.role))
    .sort((a, b) => a.code.localeCompare(b.code, "hr"))
    .map((task) => ({
      key: `task-${task.id}`,
      color: roleColor(roles, task.role),
      text: taskLabel(task),
    }));
  return [...full, ...partial];
}
