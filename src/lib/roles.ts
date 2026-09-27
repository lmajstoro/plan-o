import type { Employee, JobRole } from "../types";

export function sortJobRoles(roles: JobRole[]): JobRole[] {
  return [...roles].sort((a, b) => a.name.localeCompare(b.name, "hr"));
}

export function roleName(roles: JobRole[], id: string): string {
  return roles.find((role) => role.id === id)?.name ?? "Nepoznata uloga";
}

export function defaultRoleId(roles: JobRole[]): string {
  return sortJobRoles(roles)[0]?.id ?? "";
}

export function roleNames(roles: JobRole[], ids: string[]): string {
  const known = sortJobRoles(roles.filter((role) => ids.includes(role.id))).map((role) => role.name);
  if (ids.some((id) => !roles.some((role) => role.id === id))) known.push("Nepoznata uloga");
  return known.join(", ");
}

export function roleUsage(
  roleId: string,
  employees: Pick<Employee, "roleIds">[],
  tasks: { role: string }[],
): {
  employees: number;
  tasks: number;
} {
  return {
    employees: employees.filter((row) => row.roleIds.includes(roleId)).length,
    tasks: tasks.filter((row) => row.role === roleId).length,
  };
}
