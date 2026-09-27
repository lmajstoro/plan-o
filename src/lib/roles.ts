import type { JobRole } from "../types";

export function sortJobRoles(roles: JobRole[]): JobRole[] {
  return [...roles].sort((a, b) => a.name.localeCompare(b.name, "hr"));
}

export function roleName(roles: JobRole[], id: string): string {
  return roles.find((role) => role.id === id)?.name ?? "Nepoznata uloga";
}

export function defaultRoleId(roles: JobRole[]): string {
  return sortJobRoles(roles)[0]?.id ?? "";
}

export function roleUsage(roleId: string, employees: { role: string }[], tasks: { role: string }[]): {
  employees: number;
  tasks: number;
} {
  return {
    employees: employees.filter((row) => row.role === roleId).length,
    tasks: tasks.filter((row) => row.role === roleId).length,
  };
}
