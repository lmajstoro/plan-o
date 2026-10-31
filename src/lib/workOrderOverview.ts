import { roleColor, roleName } from "./roles";
import type { Assignment, Employee, JobRole, Task } from "../types";

export type HourPair = {
  planned: number;
  actual: number;
};

export type TaskHours = HourPair & {
  id: string;
  code: string;
  description: string;
};

export type RoleHours = HourPair & {
  id: string;
  name: string;
  color: string;
  tasks: TaskHours[];
};

export type PersonTaskHours = TaskHours & {
  roleName: string;
  roleColor: string;
};

export type PersonHours = HourPair & {
  id: string;
  name: string;
  tasks: PersonTaskHours[];
};

export type WorkOrderOverview = {
  planned: number;
  actual: number;
  roles: RoleHours[];
  people: PersonHours[];
  plannedOnly: Array<{ id: string; name: string; planned: number }>;
};

type Bucket = { planned: number; actual: number };

function addHours(bucket: Bucket, kind: Assignment["kind"], hours: number) {
  if (kind === "actual") bucket.actual += hours;
  else bucket.planned += hours;
}

function byHours(a: HourPair, b: HourPair): number {
  return b.actual - a.actual || b.planned - a.planned;
}

export function formatHours(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
  return `${text} h`;
}

export function hourDeltaLabel(planned: number, actual: number): string {
  const delta = Math.round((actual - planned) * 10) / 10;
  if (delta === 0) return "Po planu";
  const amount = formatHours(Math.abs(delta));
  return delta > 0 ? `${amount} više` : `${amount} manje`;
}

export function workOrderOverview(
  orderId: string,
  assignments: Assignment[],
  tasks: Task[],
  roles: JobRole[],
  employees: Employee[],
): WorkOrderOverview {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const roleBuckets = new Map<string, Bucket>();
  const taskBuckets = new Map<string, Bucket>();
  const personBuckets = new Map<string, Bucket>();
  const personTasks = new Map<string, Map<string, Bucket>>();

  for (const row of assignments) {
    if (row.workOrderId !== orderId) continue;
    const task = taskById.get(row.taskId);
    const roleId = task?.role ?? "";
    const roleBucket = roleBuckets.get(roleId) ?? { planned: 0, actual: 0 };
    addHours(roleBucket, row.kind, row.durationHours);
    roleBuckets.set(roleId, roleBucket);

    const taskBucket = taskBuckets.get(row.taskId) ?? { planned: 0, actual: 0 };
    addHours(taskBucket, row.kind, row.durationHours);
    taskBuckets.set(row.taskId, taskBucket);

    const personBucket = personBuckets.get(row.employeeId) ?? { planned: 0, actual: 0 };
    addHours(personBucket, row.kind, row.durationHours);
    personBuckets.set(row.employeeId, personBucket);

    const tasksForPerson = personTasks.get(row.employeeId) ?? new Map<string, Bucket>();
    const personTask = tasksForPerson.get(row.taskId) ?? { planned: 0, actual: 0 };
    addHours(personTask, row.kind, row.durationHours);
    tasksForPerson.set(row.taskId, personTask);
    personTasks.set(row.employeeId, tasksForPerson);
  }

  const roleList: RoleHours[] = [...roleBuckets.entries()].map(([roleId, hours]) => ({
    id: roleId || "nepoznato",
    name: roleId ? roleName(roles, roleId) : "Bez uloge",
    color: roleId ? roleColor(roles, roleId) : "#64748b",
    ...hours,
    tasks: [...taskBuckets.entries()]
      .filter(([taskId]) => (taskById.get(taskId)?.role ?? "") === roleId)
      .map(([taskId, taskHours]) => {
        const task = taskById.get(taskId);
        return {
          id: taskId,
          code: task?.code ?? "",
          description: task?.description ?? "Nepoznat zadatak",
          ...taskHours,
        };
      })
      .sort(byHours),
  }));
  roleList.sort(byHours);

  const people: PersonHours[] = [];
  const plannedOnly: WorkOrderOverview["plannedOnly"] = [];
  for (const [employeeId, hours] of personBuckets) {
    const employee = employeeById.get(employeeId);
    const name = employee?.name ?? "Nepoznat zaposlenik";
    if (hours.actual <= 0) {
      if (hours.planned > 0) plannedOnly.push({ id: employeeId, name, planned: hours.planned });
      continue;
    }
    const tasksForPerson = [...(personTasks.get(employeeId)?.entries() ?? [])].map(([taskId, taskHours]) => {
      const task = taskById.get(taskId);
      return {
        id: taskId,
        code: task?.code ?? "",
        description: task?.description ?? "Nepoznat zadatak",
        roleName: task ? roleName(roles, task.role) : "Bez uloge",
        roleColor: task ? roleColor(roles, task.role) : "#64748b",
        ...taskHours,
      };
    });
    tasksForPerson.sort(byHours);
    people.push({ id: employeeId, name, ...hours, tasks: tasksForPerson });
  }
  people.sort((a, b) => byHours(a, b) || a.name.localeCompare(b.name, "hr"));
  plannedOnly.sort((a, b) => b.planned - a.planned || a.name.localeCompare(b.name, "hr"));

  return {
    planned: roleList.reduce((sum, role) => sum + role.planned, 0),
    actual: roleList.reduce((sum, role) => sum + role.actual, 0),
    roles: roleList,
    people,
    plannedOnly,
  };
}
